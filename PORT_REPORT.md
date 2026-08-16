# dyon → 十周年UI 源码移植报告

## 目标
把 dyon 对十周年UI 运行时的改动，从"直接改压缩产物"迁移到"改作者源码 + vite build 产出"，以支持长期跟版合并。

## 仓库
- 源码工作区：`D:\EPIC\v1.75-win32-x64\decadeUI_src`（git，main 分支）
- 基线：作者 GitHub `diandian157/decadeUI` 的 `main` 分支源码（251 文件 curl 下载）+ v1.4 二进制资源

## git 历史（6 commit）
1. `79d748f` baseline：作者源码
2. `d66f277` chore：同步 v1.4 二进制资源 + 忽略 node_modules
3. `02d72dc` feat：A 类 token（5 文件，注册 dyon 为样式变体）
4. `4ad9dda` chore：忽略 package-lock.json
5. `a025329` feat：静态文件 + content.js + 11 新文件
6. `b7fbc9e` feat：剩余压缩类文件

## 移植清单（dyon 全部改动）
- **A 类 token（被压缩）**：ui/constants.js、src/core/{decadeModule,app,layout}.js、src/ui/player-element.js
- **静态拷贝（原样搬）**：ui/{lbtn,skill}/skins/shizhounian.js、src/styles/{decadeLayout,equip,layout}.css、ui/styles/{lbtn,skill}/shizhounian.css(+window)、didYouKnow.txt
- **content.js**：加 setupLayoutEditor/setupPortraitLetterbox 的 import + 调用
- **11 个新文件**：layoutEditor.js、portraitLetterbox.js、player7.css、dyon.js(3 皮肤)、dyon.css(5)
- **剩余压缩类**：appearance.js(样式名+热键7+playerDieEffect)、appearance-handlers.js、styleHotkeys.js、prefixMark.js、progress-bar.js、config-window.js、overrides/player/{animations,card-movement,hooks,ui}.js
- **debug.js / extensionToggle.js**：采用 dyon 可读版（eruda 位置记忆 / 开关增强）

## 构建验证
- `npm install + vite build` 成功，产出 `dist/`（结构 = 扩展目录，可直接覆盖到 `extension/十周年UI/`）
- dist vs dyon 运行时全量比对：**152 字节一致 / 4 terser 名重排(功能等价) / 79 尺寸不同 / 0 缺失**
  - 4 名重排：config-window/styleHotkeys/animations/ui.constants（npm terser 5.50 vs pnpm-lock 锁版本差异，本机 pnpm 构建可消除）
  - 79 尺寸不同：5 个预期（dyon 可读版 vs dist 压缩版）+ ~74 个因 `main` 源码比已装 v1.4 更新

## 重要说明：main vs v1.4
下载的是作者 `main` 分支源码，比你安装的 v1.4 release 略新（皮肤 baby/base/codename、CSS player1-6、libs 等有更新）。
- build 产物 = **main + dyon**（含作者最新改动），非 v1.4 + dyon
- 长期跟版应基于 `main`（推荐）
- 若要精确匹配当前 v1.4 安装：需 checkout `v1.4` tag 源码再 rebase dyon commit

## 你需要做的
1. 进入 `decadeUI_src`，本机执行 `pnpm install && pnpm build`（按 pnpm-lock 锁版本，消除 terser 名重排）
2. 把 `dist/` 内容覆盖到 `D:\EPIC\v1.75-win32-x64\无名杀-win32-x64\resources\app\extension\十周年UI\`
3. 启动游戏测试 dyon 样式与各功能
4. 跟版流程：作者出新版 → 更新 `upstream` remote → `git merge` → 解冲突（高发：content.js/shizhounian.js/decadeLayout.css）→ rebuild

## 后续可选优化
- 把 debug.js / extensionToggle.js 的 dyon 改动从"可读版整体替换"改写为"在作者源码上增量叠加"，减少未来合并噪音
- content.js 当前是作者源码格式（未 beautify），合并友好 ✓
