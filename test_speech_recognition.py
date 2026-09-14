#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
语音识别功能测试脚本
"""
import os
import sys

def test_dependencies():
    """测试依赖包是否安装"""
    print("=" * 60)
    print("1. 检查依赖包...")
    print("=" * 60)

    deps = {
        "groq": "Groq SDK",
        "pyaudio": "PyAudio (音频捕获)",
        "soundcard": "Soundcard (系统音频)",
        "numpy": "NumPy (数值计算)",
        "soundfile": "SoundFile (音频处理)"
    }

    all_ok = True
    for module, name in deps.items():
        try:
            __import__(module)
            print(f"✅ {name}")
        except ImportError:
            print(f"❌ {name} - 未安装")
            all_ok = False

    return all_ok

def test_api_keys():
    """测试 API 密钥配置"""
    print("\n" + "=" * 60)
    print("2. 检查 API 密钥配置...")
    print("=" * 60)

    # 检查环境变量
    groq_env = os.environ.get('GROQ_API_KEY', '')
    openai_env = os.environ.get('OPENAI_API_KEY', '')

    # 检查配置文件
    groq_settings = ''
    openai_settings = ''

    try:
        from core.settings_manager import SettingsManager
        settings = SettingsManager()
        groq_settings = settings.get('groq_api_key', '')
        openai_settings = settings.get('openai_api_key', '')
    except Exception as e:
        print(f"⚠️  无法加载配置文件: {e}")

    # 最终密钥
    groq_key = groq_settings or groq_env
    openai_key = openai_settings or openai_env

    mask = lambda k: f"{k[:8]}...{k[-4:]}" if len(k) > 12 else "未配置"

    print(f"Groq API Key (环境变量): {mask(groq_env) if groq_env else '未设置'}")
    print(f"Groq API Key (配置文件): {mask(groq_settings) if groq_settings else '未设置'}")
    print(f"Groq API Key (最终):     {mask(groq_key) if groq_key else '❌ 未配置'}")
    print()
    print(f"OpenAI API Key (环境变量): {mask(openai_env) if openai_env else '未设置'}")
    print(f"OpenAI API Key (配置文件): {mask(openai_settings) if openai_settings else '未设置'}")
    print(f"OpenAI API Key (最终):     {mask(openai_key) if openai_key else '未配置'}")

    has_key = bool(groq_key or openai_key)
    if has_key:
        print("\n✅ 至少配置了一个语音转写 API 密钥")
    else:
        print("\n❌ 未配置任何语音转写 API 密钥")
        print("\n请设置 Groq API Key:")
        print("  方式1: set GROQ_API_KEY=gsk_your_key_here")
        print("  方式2: 在 user_settings.json 中添加 \"groq_api_key\": \"gsk_...\"")
        print("  获取密钥: https://console.groq.com/keys")

    return has_key

def test_groq_api():
    """测试 Groq API 连接"""
    print("\n" + "=" * 60)
    print("3. 测试 Groq API 连接...")
    print("=" * 60)

    try:
        from groq import Groq
        from core.settings_manager import SettingsManager

        settings = SettingsManager()
        groq_key = settings.get('groq_api_key') or os.environ.get('GROQ_API_KEY')

        if not groq_key:
            print("❌ 未配置 Groq API Key，跳过连接测试")
            return False

        print("正在测试 API 连接...")
        client = Groq(api_key=groq_key, timeout=10.0)

        # 测试文本生成（不测试语音，避免需要音频文件）
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": "Say 'hello' in Chinese"}],
            model="llama-3.3-70b-versatile",
            max_tokens=10
        )

        result = response.choices[0].message.content
        print(f"✅ Groq API 连接成功！响应: {result}")

        # 检查可用模型
        print("\n支持的 Whisper 模型:")
        print("  • whisper-large-v3-turbo (推荐 - 更快)")
        print("  • whisper-large-v3")
        print("  • distil-whisper-large-v3-en (仅英文)")

        return True

    except Exception as e:
        print(f"❌ Groq API 连接失败: {e}")
        return False

def test_audio_devices():
    """测试音频设备"""
    print("\n" + "=" * 60)
    print("4. 检查音频设备...")
    print("=" * 60)

    try:
        import pyaudio
        p = pyaudio.PyAudio()

        print(f"检测到 {p.get_device_count()} 个音频设备:\n")

        loopback_found = False
        for i in range(p.get_device_count()):
            info = p.get_device_info_by_index(i)
            name = info['name']
            channels = info['maxInputChannels']

            if channels > 0:
                is_loopback = '立体声混音' in name or 'Stereo Mix' in name.lower()
                marker = "🎯 [回环设备]" if is_loopback else ""
                print(f"  [{i}] {name} {marker}")
                print(f"      输入通道: {channels}, 采样率: {int(info['defaultSampleRate'])} Hz")

                if is_loopback:
                    loopback_found = True

        p.terminate()

        if loopback_found:
            print("\n✅ 找到立体声混音设备（用于捕获系统音频）")
        else:
            print("\n⚠️  未找到立体声混音设备")
            print("   请在 Windows 声音设置中启用「立体声混音」：")
            print("   1. 右键点击任务栏音量图标 → 声音设置")
            print("   2. 高级声音选项 → 更多声音设置")
            print("   3. 「录制」选项卡 → 右键空白处 → 显示已禁用的设备")
            print("   4. 右键「立体声混音」→ 启用")

        return loopback_found

    except Exception as e:
        print(f"❌ 音频设备检测失败: {e}")
        return False

def main():
    print("\n🔍 doudou 语音识别功能诊断\n")

    results = []

    # 测试依赖
    results.append(("依赖包", test_dependencies()))

    # 测试 API 密钥
    results.append(("API 密钥", test_api_keys()))

    # 测试 Groq API
    results.append(("Groq 连接", test_groq_api()))

    # 测试音频设备
    results.append(("音频设备", test_audio_devices()))

    # 总结
    print("\n" + "=" * 60)
    print("📊 测试总结")
    print("=" * 60)

    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{name}: {status}")

    all_passed = all(r[1] for r in results)

    if all_passed:
        print("\n🎉 所有测试通过！语音识别功能应该可以正常工作。")
        print("\n▶️  启动应用测试:")
        print("   npm run dev")
    else:
        print("\n⚠️  部分测试失败，请根据上述提示修复问题。")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
