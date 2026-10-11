# 豆包双向流式识别诊断

从用户提供的 `C:\Users\26443\Downloads\sauc_python` 官方示例移植。
参考：[双向流式 WebSocket 文档](https://docs.volcengine.com/docs/DoubaoVoice/bidirectional-streaming-automatic-speech-recognition-websocket?lang=zh)。

此脚本独立验证鉴权、资源权限和流式协议；项目实时采集继续使用 `core/doubao_asr.py`。

在项目根目录运行：

```powershell
.\.venv\Scripts\python.exe -m pip install -r scripts/sauc_python/requirements.txt
.\.venv\Scripts\python.exe -X utf8 scripts/sauc_python/sauc_websocket_demo.py --check
.\.venv\Scripts\python.exe -X utf8 scripts/sauc_python/sauc_websocket_demo.py --file "你的音频.wav"
```

`--check` 调用真实 API、发送 1 秒静音并等待最终响应，按服务规则计费；退出码 0 表示验证通过，2 表示失败。
默认依次查找 `doudou_USER_DATA/user_settings.json`、`%APPDATA%/doudou-electron/user_settings.json`、项目根目录配置。
`--settings` 指定配置文件；`DOUBAO_API_KEY` 或 `--api_key` 覆盖配置中的密钥。密钥不会打印或写入脚本。

默认采用 `bigmodel_async`、配置中的资源 ID（缺省模型 2.0 小时版）、200 ms 音频包及二遍识别。
`--resource_id` 覆盖资源版本；`--seg-duration` 可选 100～200 ms。
旧版鉴权可使用 `--app_key` 和 `--access_key`；`--verbose` 显示协议响应与逐包日志。

16 kHz 单声道 PCM16 WAV 直接读取，其他格式需要 ffmpeg。转换结果存放在内存，原始文件不会删除或修改。
WAV 解析支持元数据子块；采用官方示例的绝对时间节拍，发送和接收同时运行。

HTTP 403 表示密钥无法访问指定资源，需检查服务开通与密钥授权。HTTP 401 表示鉴权失败。
官方原 README 示例中的 `bigmodel_nostream` 是一句话识别接口；边说边出字使用本移植版默认的 `bigmodel_async`。
