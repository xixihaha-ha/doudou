"""Official SAUC sample adapted for project settings and diagnostics."""
import argparse
import asyncio
import json
import logging
import os
from pathlib import Path
import tempfile
import wave
import aiohttp
try:
    from . import protocol
except ImportError:
    import protocol

def load_settings(path=None):
    if path:
        candidates = [Path(path)]
    else:
        candidates = []
        if os.environ.get('doudou_USER_DATA'):
            candidates.append(Path(os.environ['doudou_USER_DATA']) / 'user_settings.json')
        if os.environ.get('APPDATA'):
            candidates.append(Path(os.environ['APPDATA']) / 'doudou-electron' / 'user_settings.json')
        candidates.append(Path(__file__).resolve().parents[2] / 'user_settings.json')
    for candidate in candidates:
        if candidate.is_file():
            return json.loads(candidate.read_text(encoding='utf-8-sig'))
    if path:
        raise FileNotFoundError('指定的配置文件不存在')
    return {}

def parser():
    result = argparse.ArgumentParser(description='豆包双向流式识别：官方示例移植版')
    result.add_argument('--file', help='音频路径；其他格式需要 ffmpeg')
    result.add_argument('--check', action='store_true', help='发送 1 秒静音检查鉴权和完整协议')
    result.add_argument('--settings', help='指定 user_settings.json，默认读取 Electron 用户配置')
    result.add_argument('--url', default='wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async')
    result.add_argument('--seg-duration', type=int, default=200, help='每包音频时长，100～200 ms')
    result.add_argument('--api_key', default='', help='新版密钥，推荐读取配置或 DOUBAO_API_KEY')
    result.add_argument('--app_key', default='', help='旧版 App ID，需配合 access_key')
    result.add_argument('--access_key', default='', help='旧版 Access Token')
    result.add_argument('--resource_id', help='覆盖配置中的识别资源 ID')
    result.add_argument('--verbose', action='store_true', help='输出每个协议响应')
    return result

async def recognize(args, config, filename):
    payload = {
        'user': {'uid': 'doudou-diagnostic'},
        'audio': {'format': 'wav', 'codec': 'raw', 'rate': 16000, 'bits': 16, 'channel': 1},
        'request': {'model_name': 'bigmodel', 'enable_itn': True, 'enable_punc': True,
                    'show_utterances': True, 'enable_nonstream': True},
    }
    if 'bigmodel_nostream' in args.url or args.url.rstrip('/').endswith('/bigmodel'):
        payload['request']['enable_nonstream'] = False
    final_received = False
    async with protocol.AsrWsClient(args.url, args.seg_duration) as client:
        async for response in client.execute(filename, config, payload):
            data = response.payload_msg or {}
            result = data.get('result') or {}
            if isinstance(result, list):
                result = result[0] if result else {}
            text = result.get('text', '')
            if text:
                print(('最终: ' if response.is_last_package else '实时: ') + text, flush=True)
            final_received |= response.is_last_package
    if not final_received:
        raise RuntimeError('未收到最终响应，流式诊断未通过')
    print('流式连接、音频发送和最终响应验证通过。')

async def main(argv=None):
    argument_parser = parser()
    args = argument_parser.parse_args(argv)
    if bool(args.file) == bool(args.check):
        argument_parser.error('请选择 --file 音频路径 或 --check 其中之一')
    if not 100 <= args.seg_duration <= 200:
        argument_parser.error('--seg-duration 必须在 100～200 ms 之间')
    logging.getLogger().setLevel(logging.INFO if args.verbose else logging.CRITICAL)
    config = None
    try:
        settings = load_settings(args.settings)
        legacy = bool(args.app_key or args.access_key)
        config = protocol.Config(
            api_key=args.api_key or ('' if legacy else os.environ.get('DOUBAO_API_KEY') or settings.get('doubao_api_key', '')),
            app_key=args.app_key, access_key=args.access_key,
            resource_id=args.resource_id or settings.get('doubao_resource_id') or 'volc.seedasr.sauc.duration',
        )
        if not config.api_key and not (config.app_key and config.access_key):
            raise RuntimeError('请先保存豆包语音密钥，或提供完整的旧版鉴权信息')
        if args.check:
            with tempfile.TemporaryDirectory(prefix='doudou_sauc_') as directory:
                filename = str(Path(directory) / 'silence.wav')
                with wave.open(filename, 'wb') as audio:
                    audio.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                    audio.writeframes(b'\x00\x00' * 16000)
                await recognize(args, config, filename)
        else:
            await recognize(args, config, args.file)
        return 0
    except aiohttp.WSServerHandshakeError as error:
        if error.status == 403:
            print(f'HTTP 403：该密钥无权访问资源 {config.resource_id}，请检查豆包语音服务开通及密钥授权。')
        elif error.status == 401:
            print('HTTP 401：密钥无效，请检查是否使用豆包语音控制台的 API Key。')
        else:
            print(f'WebSocket 建连失败，HTTP {error.status}。')
        return 2
    except Exception as error:
        message = str(error)
        if config:
            for secret in (config.api_key, config.access_key):
                if secret:
                    message = message.replace(secret, '[已隐藏]')
        print(f'诊断失败：{type(error).__name__}: {message}')
        return 2

if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
