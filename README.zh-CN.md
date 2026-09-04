# CuteNote AI 集成

> 在 AI 客户端里，把公开视频、公开网页或你提供的长文本生成长图笔记、脑图或详细 Markdown，并读取和导出已有笔记。

**MCP 地址：** `https://www.cutenote.app/mcp`
**传输协议：** 远程 Streamable HTTP
**身份验证：** 浏览器内完成 OAuth 2.1 授权码 + PKCE；不要把令牌粘贴进聊天。

[English](README.md) · [GitHub 公开源码](https://github.com/JoeyMonki/cutenote-integrations) · [CuteNote 官网](https://www.cutenote.app/) · [网页安装向导](https://www.cutenote.app/ai-skill)

此公开集成包采用 [MIT License](LICENSE)，仅包含 Skill、MCP 客户端配置、插件/连接器元数据、公开文档及发布工具；不包含 CuteNote 私有应用源码或 Git 历史。

## 五个工具

| 工具 | 作用 |
| --- | --- |
| `create_note` | 根据文本或支持的公开 URL 创建异步笔记生成任务。 |
| `get_generation_job` | 轮询任务，直到完成、失败或被阻止。 |
| `list_notes` | 列出当前登录用户最近的笔记。 |
| `get_note` | 读取当前用户拥有的笔记元数据和指定内容。 |
| `export_note` | 导出 PNG、Markdown、源文本，或在明确要求时导出兼容用 SVG。 |

CuteNote 有意不提供 `ask_note` 工具。

## 快速安装

1. 如果目标 AI 已有正式发布的官方市场或插件入口，优先使用该入口。本仓库中的包是源产物，**不代表**已经上架。
2. 如果客户端支持远程 Streamable HTTP MCP 和浏览器 OAuth，把 `https://www.cutenote.app/mcp` 添加为名为 `cutenote` 的服务器。
3. 在浏览器完成 CuteNote 授权。不要在配置或提示词中填写 API Key、Access Token 或 Refresh Token。
4. 先让客户端列出五个工具，再使用一条 [Starter prompt](docs/starter-prompts.md) 创建内容。

客户端专用源产物位于 [`codex/`](codex/)、[`claude-code/`](claude-code/)、[`workbuddy/`](workbuddy/)、[`openclaw/`](openclaw/) 和 [`hermes/`](hermes/)。不要把某个客户端的配置字段照搬到另一个客户端。

## 兼容状态

当前仓库尚未记录任何客户端的完整端到端验收。已有安装包只通过了静态产物检查，因此运行状态保守标记为 `experimental`；尚无安装包的客户端在完成协议和版本测试前标记为 `unknown`。

详见 [兼容矩阵](docs/compatibility.md) 和机器可读的 [`compatibility.json`](compatibility.json)。允许的状态为 `verified`、`compatible`、`adapter_required`、`experimental`、`unsupported` 和 `unknown`；每条记录都包含客户端版本和 `last_verified_at`，未知值明确写为 `null`。

## 文档入口

- [身份验证](docs/authentication.md)
- [工具与调用流程](docs/tools.md)
- [常用任务与 Starter prompts](docs/starter-prompts.md)
- [故障排查](docs/troubleshooting.md)
- [安全与数据处理](docs/security.md)
- [数据流](docs/data-flow.md)
- [兼容政策与矩阵](docs/compatibility.md)
- [发布、版本与官方来源规则](PUBLISHING.md)
- [变更日志](CHANGELOG.md)
- [`release.json` 版本清单](release.json)

## 公开链接与官方来源

- 官网：[www.cutenote.app](https://www.cutenote.app/)
- 安装向导：[www.cutenote.app/ai-skill](https://www.cutenote.app/ai-skill)
- 官方公开源码：[github.com/JoeyMonki/cutenote-integrations](https://github.com/JoeyMonki/cutenote-integrations)
- 隐私政策：**TODO — 尚未确认公开 URL**
- 服务条款：**TODO — 尚未确认公开 URL**
- 用户支持：**TODO — 尚未确认公开支持 URL**
- 服务状态：**TODO — 尚未确认公开状态页**

官方公开源码仓库是 [JoeyMonki/cutenote-integrations](https://github.com/JoeyMonki/cutenote-integrations)，它是私有编写源的单向生成镜像。GitHub 源码仓库已经上线；GitHub Release、npm 发布、市场条目和远程发布自动化尚未上线。详见 [PUBLISHING.md](PUBLISHING.md)。

## 校验源码工作区

```bash
npm run check
```

该命令检查版本与 canonical Skill 漂移、JSON/JSONC/YAML 语法、文档结构、兼容记录、公开链接安全、生产 MCP URL、Skill frontmatter 和常见密钥特征。
