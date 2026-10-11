"""Doubao bidirectional ASR binary protocol and streaming session.

Protocol: https://docs.volcengine.com/docs/6561/1354869
"""
import gzip
import json
import struct
import threading
import uuid

import numpy as np

ENDPOINT = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async"
DEFAULT_RESOURCE = "volc.seedasr.sauc.duration"


def encode_packet(kind, payload, sequence, final=False):
    compressed = gzip.compress(payload)
    flags = 3 if final else 1
    serialization = 1 if kind == 1 else 0
    return (bytes([0x11, (kind << 4) | flags, (serialization << 4) | 1, 0])
            + struct.pack(">iI", -sequence if final else sequence, len(compressed))
            + compressed)


def decode_packet(packet):
    if not isinstance(packet, bytes) or len(packet) < 4:
        raise ValueError("Invalid ASR response header")
    offset = (packet[0] & 15) * 4
    if packet[0] >> 4 != 1 or offset < 4 or len(packet) < offset:
        raise ValueError("Invalid ASR protocol version/header")
    kind, flags = packet[1] >> 4, packet[1] & 15
    def read_int(signed=False):
        nonlocal offset
        if len(packet) < offset + 4:
            raise ValueError("Truncated ASR response")
        value = struct.unpack(">i" if signed else ">I", packet[offset:offset + 4])[0]
        offset += 4
        return value
    if flags & 1:
        read_int(True)
    if flags & 4:
        read_int()
    if kind not in (9, 15):
        raise ValueError("Unsupported ASR response type")
    code = read_int() if kind == 15 else 0
    size = read_int()
    payload = packet[offset:]
    if len(payload) != size:
        raise ValueError("Invalid ASR response size")
    if packet[2] & 15 == 1:
        payload = gzip.decompress(payload)
    elif packet[2] & 15:
        raise ValueError("Unsupported ASR compression")
    if code:
        # Do not surface arbitrary server payloads (may include credentials).
        raise RuntimeError(f"豆包语音识别服务错误，错误码 {code}")
    data = json.loads(payload) if payload else {}
    if data.get("code", 0) not in (0, 1000, 20000000):
        raise RuntimeError(f"豆包语音识别服务错误，错误码 {data['code']}")
    return data, bool(flags & 2)


def pcm16(data, rate):
    """Convert a mono float capture block to 16 kHz signed little-endian PCM."""
    audio = np.nan_to_num(np.asarray(data, dtype=np.float32))
    if rate <= 0:
        raise ValueError("Invalid sample rate")
    if rate != 16000 and len(audio):
        if rate > 16000:
            size = max(3, int(rate * 0.002) | 1)
            pos = np.arange(size) - (size - 1) / 2
            filt = np.sinc((16000 / rate) * pos) * np.hanning(size)
            filt /= filt.sum()
            audio = np.convolve(np.pad(audio, (size // 2, size // 2), mode="edge"), filt, mode="valid")
        count = round(len(audio) * 16000 / rate)
        audio = np.interp(np.arange(count) * rate / 16000, np.arange(len(audio)), audio)
    return (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()


class TranscriptUpdates:
    """Snapshots replace interim text; finalized utterances are emitted once."""
    def __init__(self, on_final, on_partial):
        self.on_final = on_final
        self.on_partial = on_partial
        self.committed_end = -1

    def accept(self, data, last=False):
        result = data.get("result") or {}
        if isinstance(result, list):
            result = result[0] if result else {}
        partial = []
        for utterance in result.get("utterances", []):
            end = utterance.get("end_time", -1)
            text = utterance.get("text", "").strip()
            if end <= self.committed_end:
                continue
            if utterance.get("definite") or last:
                self.committed_end = end
                if text:
                    self.on_final(text)
            elif text:
                partial.append(text)
        if not result.get("utterances") and self.committed_end < 0:
            text = result.get("text", "").strip()
            if last and text:
                self.on_final(text)
                self.committed_end = 0
            else:
                partial.append(text)
        self.on_partial("".join(partial))


class DoubaoSession:
    def __init__(self, key, resource, on_final, on_partial):
        self.key = key
        self.resource = resource
        self.updates = TranscriptUpdates(on_final, on_partial)
        self.socket = None
        self.sequence = 1
        self.error = None
        self.finished = threading.Event()
        self.closing = False
        self.receiver = None

    def connect(self):
        import websocket
        request_id = str(uuid.uuid4())
        try:
            self.socket = websocket.create_connection(ENDPOINT, timeout=5, header={
                "X-Api-Key": self.key,
                "X-Api-Resource-Id": self.resource,
                "X-Api-Request-Id": request_id,
            })
        except websocket.WebSocketBadStatusException as error:
            if error.status_code == 403:
                raise RuntimeError("豆包语音 HTTP 403：密钥无权访问所选流式资源，请检查服务开通及 API Key 授权。") from None
            if error.status_code == 401:
                raise RuntimeError("豆包语音 HTTP 401：鉴权失败，请检查豆包语音 API Key。") from None
            raise RuntimeError(f"豆包语音 WebSocket 建连失败，HTTP {error.status_code}。") from None
        except websocket.WebSocketTimeoutException:
            raise RuntimeError("豆包语音 WebSocket 建连超时，请检查网络。") from None
        request = {
            "user": {"uid": "doudou"},
            "audio": {"format": "pcm", "codec": "raw", "rate": 16000, "bits": 16, "channel": 1},
            "request": {"model_name": "bigmodel", "enable_itn": True,
                        "enable_punc": True, "show_utterances": True, "enable_nonstream": True},
        }
        self.socket.send_binary(encode_packet(1, json.dumps(request).encode(), self.sequence))
        try:
            data, last = decode_packet(self.socket.recv())
        except websocket.WebSocketTimeoutException:
            raise RuntimeError("豆包语音初始化响应超时，请检查网络或稍后重试。") from None
        self.updates.accept(data, last)
        if last:
            raise RuntimeError("豆包识别会话提前结束，请检查服务权限。")
        self.receiver = threading.Thread(target=self._receive, daemon=True)
        self.receiver.start()

    def _receive(self):
        import websocket
        try:
            while not self.closing:
                try:
                    packet = self.socket.recv()
                except websocket.WebSocketTimeoutException:
                    # Silence may produce no results for many seconds. Keep
                    # receiving; disconnection/send failures still trigger retry.
                    continue
                if not packet:
                    raise ConnectionError("ASR connection closed")
                data, last = decode_packet(packet)
                self.updates.accept(data, last)
                if last:
                    break
        except Exception as exc:
            if not self.closing:
                self.error = exc
        finally:
            self.finished.set()

    def send(self, data, rate):
        if self.error:
            raise self.error
        if self.finished.is_set():
            raise ConnectionError("ASR session ended")
        self.sequence += 1
        import websocket
        try:
            self.socket.send_binary(encode_packet(2, pcm16(data, rate), self.sequence))
        except websocket.WebSocketTimeoutException:
            raise RuntimeError("豆包语音音频发送超时，请检查网络。") from None

    def close(self, graceful=True):
        try:
            if self.socket and graceful and not self.finished.is_set() and not self.error:
                self.sequence += 1
                self.socket.send_binary(encode_packet(2, b"", self.sequence, final=True))
                self.finished.wait(2)
        except Exception:
            pass
        finally:
            self.closing = True
            if self.socket:
                try:
                    self.socket.close()
                except Exception:
                    pass
            if self.receiver:
                self.receiver.join(timeout=1)
            self.updates.on_partial("")
