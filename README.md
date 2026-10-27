## 扩展介绍

无名杀游戏的界面美化扩展。

本仓库是 [十周年UI（zziyoo/decadeUI）](https://github.com/zziyoo/decadeUI) 的同步分支：跟随上游更新，
并额外维护一套**横向布局**样式。

- 版本号跟随上游，不另立版本序列；上游升版，本仓库同步升版。
- 上游只推 commit 不发 release 时，本仓库按 commit 同步，再自行打包发布。
- 自有改动一律限定在横向布局内，其它样式（十周年、移动版、一将成名、online、欢乐三国杀、名将杀）的行为与上游保持一致。

## 下载与安装

1. 到 [Releases](https://github.com/pandipper/decadeUI/releases) 下载最新的 `UI-<版本号>.zip`
2. 解压后覆盖到无名杀的 `extension/十周年UI/` 目录

> 需要《无名杀》本体 ≥ **1.11.6.1**（`minNonameVersion` 跟随上游）。

## 横向布局

在「十周年UI配置中心 → 整体外观 → 切换样式」中选择**横向布局**；电脑端也可以按 `Alt+7` 直接切换，
切换后游戏会自动重载。

横向布局下界面按横向方向重新排布，并在「其他设置 → 武将信息」里额外提供两个开关：

- **双击角色看技能而非介绍**：双击武将打开的名片默认切到「技能」页
- **技能描述高亮**：技能描述里的时机与频率关键词（如「出牌阶段」「每回合限一次」「受到伤害后」）标橙

这些改动只作用于横向布局，切到其它样式即恢复上游原样。

## 布局编辑器

「整体外观 → 进入/退出普通牌局布局编辑」可进入可视化布局编辑：拖动角色单元调整位置，
拖动右下角统一缩放，每次松手自动记忆；「恢复当前牌局默认布局」会清除当前模式、人数、
样式与桌面/触屏方向对应的布局记忆。

## 使用帮助

详细的配置说明请参考 `docs/` 目录：

- [卡牌皮肤注册](docs/card-skin-api.md) - 外部扩展注册卡牌皮肤的方法
- [前缀角标注册](docs/prefix-mark-api.md) - 武将前缀角标的配置方法
- [动态皮肤配置](docs/dynamic-skin-api.md) - Spine骨骼动画皮肤的配置方法
- [露头头像配置](docs/outcrop-avatar-api.md) - 露头头像的目录结构和API
- [骨骼动画定位](docs/spine-positioning-api.md) - Spine骨骼动画定位系统说明
- [版本更新日志](docs/update.md) - 十周年UI版本更新日志
- [报错兜底处理](docs/secret.md) - 与无名杀版本不匹配下游玩方法

## 相关链接

- 无名杀游戏：https://github.com/libnoname/noname
- 上游仓库（十周年UI）：https://github.com/zziyoo/decadeUI
- 本仓库发布页：https://github.com/pandipper/decadeUI/releases

## 相关人员

- 原创作者：短歌
- 手杀UI原作者：橙续缘
- 上上任维护者：[萌新（转型中）](https://github.com/mengxinzxz)
- 上任维护者：[点点](https://github.com/diandian157)
- 现任维护者：[子右](https://github.com/zziyoo)
- 本仓库（横向布局）维护者：[pandipper](https://github.com/pandipper)

## 许可证

GPL-3.0
