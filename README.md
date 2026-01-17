# MXU

**MXU** 是一个基于 [MaaFramework ProjectInterface V2](https://github.com/MaaXYZ/MaaFramework/blob/main/docs/zh_cn/3.3-标准化接口设计.md) 协议的通用 GUI 客户端，使用 Tauri + React + TypeScript 构建。

它可以解析任何符合 PI V2 标准的 `interface.json` 文件，为 MaaFramework 生态中的自动化项目提供开箱即用的图形界面。

## ✨ 特性

- 📋 **任务管理** - 可视化配置任务列表，支持拖拽排序
- 🔧 **多实例支持** - 同时管理多个独立运行的实例
- 🎮 **多控制器类型** - 支持 Adb、Win32、PlayCover、Gamepad
- 🌍 **国际化** - 内置中/英文界面，自动加载 `interface.json` 中的翻译
- 🎨 **明暗主题** - 支持 Light/Dark 主题切换
- 📱 **实时截图** - 显示设备实时画面（开发中）
- 📝 **运行日志** - 查看任务执行日志（开发中）

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/) >= 1.70（用于 Tauri 编译）

### 安装依赖

```bash
pnpm install
```

### 开发调试

#### 浏览器模式（仅前端）

```bash
pnpm dev
```

访问 http://localhost:1420 查看界面。此模式会自动加载 `public/test/interface.json` 作为测试数据。

#### Tauri 桌面应用模式

```bash
pnpm tauri dev
```

此命令会同时启动前端开发服务器和 Tauri 桌面应用，支持热重载。

### 生产构建

```bash
pnpm tauri build
```

构建产物位于 `src-tauri/target/release/` 目录。

## 📖 使用方式

### 作为独立 GUI 使用

1. 将编译好的 MXU 可执行文件放入你的 MaaFramework 项目目录
2. 确保同级目录下存在 `interface.json` 文件
3. 运行 MXU

### interface.json 加载规则

MXU 会按以下顺序查找 `interface.json`：

1. **正式模式**: `./interface.json`（程序所在目录）
2. **调试模式**: `./test/interface.json`（用于开发测试）

调试模式会在界面顶部显示提示条。

### 配置文件

用户配置保存在 `mxu.json` 中，包含：

- 当前选择的控制器和资源
- 各实例的任务列表和选项配置
- 界面偏好设置

## 🔧 技术栈

| 类别 | 技术 |
|------|------|
| 桌面框架 | [Tauri](https://tauri.app/) v2 |
| 前端框架 | [React](https://react.dev/) 19 |
| 类型系统 | [TypeScript](https://www.typescriptlang.org/) 5.8 |
| 样式方案 | [Tailwind CSS](https://tailwindcss.com/) 4 |
| 状态管理 | [Zustand](https://zustand-demo.pmnd.rs/) |
| 国际化 | [i18next](https://www.i18next.com/) + react-i18next |
| 拖拽排序 | [@dnd-kit](https://dndkit.com/) |
| 图标 | [Lucide React](https://lucide.dev/) |
| 构建工具 | [Vite](https://vitejs.dev/) 7 |

## 🤝 相关项目

- [MaaFramework](https://github.com/MaaXYZ/MaaFramework) - 基于图像识别的自动化黑盒测试框架
- [MFAAvalonia](https://github.com/SweetSmellFox/MFAAvalonia) - 基于 Avalonia 的跨平台 GUI
- [MFW-PyQt6](https://github.com/overflow65537/MFW-PyQt6) - 基于 PyQt6 的 GUI

## 📄 License

[MIT](LICENSE)
