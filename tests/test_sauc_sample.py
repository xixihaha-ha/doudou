"""Test the migrated sample with local audio and a local WebSocket service."""
import asyncio
import contextlib
import gzip
import io
import json
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave

from aiohttp import web, WSMsgType
from scripts.sauc_python import protocol, sauc_websocket_demo as demo


def wav_bytes(rate=16000, channels=1):
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as audio:
        audio.setparams((channels, 2, rate, 0, 'NONE', 'not compressed'))
        audio.writeframes(b'\x00\x00' * (rate // 2) * channels)
    return buffer.getvalue()


def server_packet(data, last=False):
    payload = gzip.compress(json.dumps(data).encode())
    return bytes([0x11, 0x93 if last else 0x91, 0x11, 0]) + struct.pack('>iI', -1 if last else 1, len(payload)) + payload


class AudioTests(unittest.TestCase):
    def test_wav_metadata_and_padding(self):
        original = wav_bytes()
        chunk = b'JUNK' + struct.pack('<I', 3) + b'abc\x00'
        modified = original[:12] + chunk + original[12:]
        modified = modified[:4] + struct.pack('<I', len(modified) - 8) + modified[8:]
        self.assertEqual(protocol.CommonUtils.read_wav_info(modified)[:4], (1, 2, 16000, 8000))

    def test_conversion_preserves_input_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.mp3'
            path.write_bytes(b'original')
            result = type('Result', (), {'stdout': wav_bytes()})()
            with patch.object(protocol.subprocess, 'run', return_value=result):
                protocol.CommonUtils.convert_wav_with_path(str(path))
            self.assertEqual(path.read_bytes(), b'original')

    def test_project_settings_lookup_and_utf8_bom(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'user_settings.json'
            path.write_text(json.dumps({'doubao_api_key': 'test-key'}), encoding='utf-8-sig')
            with patch.dict(os.environ, {'doudou_USER_DATA': directory}):
                self.assertEqual(demo.load_settings()['doubao_api_key'], 'test-key')


class StreamingTests(unittest.IsolatedAsyncioTestCase):
    async def start_server(self, handler):
        app = web.Application()
        app.router.add_get('/asr', handler)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '127.0.0.1', 0)
        await site.start()
        self.addAsyncCleanup(runner.cleanup)
        port = site._server.sockets[0].getsockname()[1]
        return f'ws://127.0.0.1:{port}/asr'

    async def run_cli(self, url):
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as directory:
            settings = Path(directory) / 'settings.json'
            settings.write_text(json.dumps({'doubao_api_key': 'test-key', 'doubao_resource_id': 'test-resource'}))
            with patch.dict(os.environ, {'DOUBAO_API_KEY': ''}), contextlib.redirect_stdout(output):
                code = await demo.main(['--check', '--settings', str(settings), '--url', url])
        return code, output.getvalue()

    async def test_complete_bidirectional_protocol(self):
        captured = []
        async def handler(request):
            self.assertEqual(request.headers['X-Api-Key'], 'test-key')
            self.assertEqual(request.headers['X-Api-Resource-Id'], 'test-resource')
            socket = web.WebSocketResponse()
            await socket.prepare(request)
            async for message in socket:
                self.assertEqual(message.type, WSMsgType.BINARY)
                packet = message.data
                captured.append(packet)
                last = bool(packet[1] & 2)
                await socket.send_bytes(server_packet({'result': {'text': '完成' if last else ''}}, last))
                if last:
                    break
            return socket
        url = await self.start_server(handler)
        code, output = await self.run_cli(url)
        self.assertEqual(code, 0, output)
        self.assertTrue(captured[-1][1] & 2)
        self.assertLess(struct.unpack('>i', captured[-1][4:8])[0], 0)
        payload = json.loads(gzip.decompress(captured[0][12:]))
        self.assertEqual(payload['audio']['format'], 'wav')
        self.assertTrue(payload['request']['enable_nonstream'])
        audio = b''.join(gzip.decompress(packet[12:]) for packet in captured[1:])
        self.assertEqual(protocol.CommonUtils.read_wav_info(audio)[:4], (1, 2, 16000, 16000))

    async def test_handshake_forbidden_returns_failure_code(self):
        async def handler(request):
            return web.Response(status=403)
        code, output = await self.run_cli(await self.start_server(handler))
        self.assertEqual(code, 2)
        self.assertIn('403', output)
        self.assertNotIn('test-key', output)

    async def test_early_close_is_not_reported_as_success(self):
        async def handler(request):
            socket = web.WebSocketResponse()
            await socket.prepare(request)
            await socket.receive()
            await socket.send_bytes(server_packet({}))
            await socket.receive()
            await socket.close()
            return socket
        code, output = await self.run_cli(await self.start_server(handler))
        self.assertEqual(code, 2, output)

    async def test_incompatible_wav_is_converted(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'stereo.wav'
            path.write_bytes(wav_bytes(rate=48000, channels=2))
            client = protocol.AsrWsClient('unused')
            with patch.object(protocol.CommonUtils, 'convert_wav_with_path', return_value=wav_bytes()) as convert:
                converted = await client.read_audio_data(str(path))
            convert.assert_called_once_with(str(path), 16000)
            self.assertEqual(protocol.CommonUtils.read_wav_info(converted)[:3], (1, 2, 16000))


if __name__ == '__main__':
    unittest.main()
