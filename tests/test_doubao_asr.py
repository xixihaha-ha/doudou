import gzip
import json
import struct
import unittest
from unittest.mock import patch

import numpy as np

from core.doubao_asr import (
    DoubaoSession, TranscriptUpdates, decode_packet, encode_packet, pcm16,
)


def response(data, flags=1, compressed=True):
    payload = json.dumps(data).encode()
    if compressed:
        payload = gzip.compress(payload)
    sequence = struct.pack('>i', -1 if flags & 2 else 1) if flags & 1 else b''
    return (bytes([0x11, 0x90 | flags, 0x10 | int(compressed), 0])
            + sequence + struct.pack('>I', len(payload)) + payload)


class ProtocolTests(unittest.TestCase):
    def test_audio_encoding_and_last_sequence(self):
        packet = encode_packet(2, b'\x00\x00', 7, final=True)
        self.assertEqual(packet[:4], b'\x11\x23\x01\x00')
        self.assertEqual(struct.unpack('>i', packet[4:8])[0], -7)
        self.assertEqual(gzip.decompress(packet[12:]), b'\x00\x00')

    def test_server_response_variants(self):
        data = {'result': {'text': '你好'}}
        for flags in (0, 1, 2, 3):
            for compressed in (True, False):
                self.assertEqual(decode_packet(response(data, flags, compressed)),
                                 (data, bool(flags & 2)))

    def test_error_and_truncated_packets(self):
        error = b'\x11\xf0\x00\x00' + struct.pack('>II', 45000001, 0)
        with self.assertRaisesRegex(RuntimeError, '45000001'):
            decode_packet(error)
        for packet in (b'', b'\x11\x91\x11\x00', response({})[:-1]):
            with self.assertRaises(ValueError):
                decode_packet(packet)

    def test_pcm_rate_length_and_clipping(self):
        for rate in (16000, 44100, 48000):
            data = np.full(rate // 10, 2.0, dtype=np.float32)
            pcm = np.frombuffer(pcm16(data, rate), dtype='<i2')
            self.assertEqual(len(pcm), 1600)
            self.assertTrue(np.all(pcm == 32767))

    def test_resampling_suppresses_aliasing(self):
        t = np.arange(4800) / 48000
        low = np.frombuffer(pcm16(np.sin(2 * np.pi * 1000 * t), 48000), dtype='<i2')
        high = np.frombuffer(pcm16(np.sin(2 * np.pi * 12000 * t), 48000), dtype='<i2')
        self.assertLess(np.std(high[100:-100]), np.std(low[100:-100]) * 0.1)


class TranscriptTests(unittest.TestCase):
    def test_revisions_finalization_and_repeated_snapshots(self):
        finals, partials = [], []
        updates = TranscriptUpdates(finals.append, partials.append)
        def update(text, end, definite):
            return {'text': text, 'start_time': 0, 'end_time': end, 'definite': definite}
        updates.accept({'result': {'utterances': [update('你好', 400, False)]}})
        updates.accept({'result': {'utterances': [update('你好世界', 900, False)]}})
        snapshot = {'result': {'utterances': [update('你好世界。', 1000, True)]}}
        updates.accept(snapshot)
        updates.accept(snapshot)
        updates.accept({'result': {'utterances': [update('你好世界。', 1000, True),
                                                 update('下一句', 1500, False)]}})
        self.assertEqual(finals, ['你好世界。'])
        self.assertEqual(partials, ['你好', '你好世界', '', '', '下一句'])

    def test_identical_text_in_different_utterances_is_preserved(self):
        finals = []
        updates = TranscriptUpdates(finals.append, lambda text: None)
        for end in (1000, 2000):
            updates.accept({'result': {'utterances': [
                {'text': '好的', 'end_time': end, 'definite': True}]}})
        self.assertEqual(finals, ['好的', '好的'])

    def test_final_packet_commits_pending_utterance(self):
        finals = []
        updates = TranscriptUpdates(finals.append, lambda text: None)
        updates.accept({'result': {'utterances': [
            {'text': '结束', 'end_time': 500, 'definite': False}]}}, last=True)
        self.assertEqual(finals, ['结束'])


class LifecycleTests(unittest.TestCase):
    def test_idle_receive_timeouts_do_not_end_session(self):
        import websocket
        import queue
        replies = queue.Queue()
        replies.put(response({}))
        replies.put(websocket.WebSocketTimeoutException('idle'))
        replies.put(websocket.WebSocketTimeoutException('still idle'))
        replies.put(response({'result': {'utterances': [
            {'text': '静音之后继续识别', 'end_time': 6000, 'definite': True}]}}, flags=3))
        finals = []
        class Socket:
            def send_binary(self, packet):
                pass
            def recv(self):
                item = replies.get(timeout=1)
                if isinstance(item, Exception):
                    raise item
                return item
            def close(self):
                pass
        with patch('websocket.create_connection', return_value=Socket()):
            session = DoubaoSession('test-key', 'test-resource', finals.append, lambda t: None)
            session.connect()
            self.assertTrue(session.finished.wait(1))
            self.assertIsNone(session.error)
            self.assertEqual(finals, ['静音之后继续识别'])
            session.close()

    def test_disconnection_still_ends_session(self):
        import websocket
        class Socket:
            reads = 0
            def send_binary(self, packet):
                pass
            def recv(self):
                self.reads += 1
                if self.reads == 1:
                    return response({})
                raise websocket.WebSocketConnectionClosedException('closed')
            def close(self):
                pass
        with patch('websocket.create_connection', return_value=Socket()):
            session = DoubaoSession('test-key', 'test-resource', lambda t: None, lambda t: None)
            session.connect()
            self.assertTrue(session.finished.wait(1))
            self.assertIsInstance(session.error, websocket.WebSocketConnectionClosedException)
            session.close()

    def test_forbidden_resource_has_actionable_error_without_credentials(self):
        import websocket
        error = websocket.WebSocketBadStatusException('test-key', status_code=403)
        session = DoubaoSession('test-key', 'test-resource', lambda t: None, lambda t: None)
        with patch('websocket.create_connection', side_effect=error):
            with self.assertRaisesRegex(RuntimeError, '403') as caught:
                session.connect()
        self.assertNotIn('test-key', str(caught.exception))

    def test_streaming_and_graceful_finish(self):
        import queue
        replies = queue.Queue()
        replies.put(response({}))
        sent, finals, partials = [], [], []
        class Socket:
            def send_binary(self, packet):
                sent.append(packet)
                if packet[1] & 2:
                    replies.put(response({'result': {'utterances': [
                        {'text': '停止时的最后一句', 'end_time': 1000, 'definite': True}]}}, flags=3))
            def recv(self):
                return replies.get(timeout=3)
            def close(self):
                pass
        with patch('websocket.create_connection', return_value=Socket()) as connect:
            session = DoubaoSession('test-key', 'test-resource', finals.append, partials.append)
            session.connect()
            session.send(np.zeros(1600), 16000)
            session.close()
        self.assertEqual(len(sent), 3)
        self.assertEqual(finals, ['停止时的最后一句'])
        self.assertEqual(partials[-1], '')
        self.assertFalse(session.receiver.is_alive())
        self.assertEqual(connect.call_args.kwargs['header']['X-Api-Key'], 'test-key')
        request = json.loads(gzip.decompress(sent[0][12:]))
        self.assertTrue(request['request']['enable_nonstream'])
        self.assertEqual(request['audio']['format'], 'pcm')


if __name__ == '__main__':
    unittest.main()
