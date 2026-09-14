/**
 * @fileoverview 技能描述关键词高亮模块
 * @description 在技能描述的加工管线中，为「时机」与「频率」类关键词上色。
 * 词表按 A 阶段 / B 回合 / C 结算 / D 频率 四组组织，全部以正则表达。
 * @module ui/skillDescHighlight
 */
import { lib } from "noname";

/** 配置键（不含 extension_十周年UI_ 前缀） */
const CONFIG_KEY = "skillDescHighlight";

/** 关键词外层标签的类名，颜色定义见 src/styles/extension.css */
const HL_CLASS = "decade-skill-hl";

/**
 * 关键词规则表
 * @description 顺序敏感：模板与长词必须排在短词之前，否则短词会先命中同一位置。
 * 分隔符一律用 [^，。；]，避免跨分句匹配吞掉整句。
 * @type {RegExp}
 */
const KEYWORD_RE = new RegExp(
	[
		// C 组 · 结算 / 移动 / 判定（收窄模板，避免过度匹配）
		"受到[^，。；]{0,4}?伤害(?:时|后)",
		"造成[^，。；]{0,4}?伤害(?:时|后)",
		"(?:回复|失去)[^，。；]{0,3}?体力(?:时|后)",
		"(?:摸|弃置|获得|失去)[^，。；]{0,3}?牌(?:时|后)",
		"进入弃牌堆(?:时|后)",
		"游戏开始时",
		"(?:拼点|判定)(?:时|后)",
		"(?:濒死|阵亡|死亡)(?:时|后)",
		// B 组 · 回合时机与限定语
		"直到回合结束",
		"一名[^，。；]{0,8}?的回合(?:开始|结束)时",
		"你的回合(?:开始|结束)时",
		"回合(?:开始|结束)时",
		"下回合开始",
		"你的回合内",
		"你的回合外",
		"回合外",
		"本回合内",
		"本回合",
		"下回合",
		"上回合",
		// D 组 · 频率限制
		"每(?:回合|轮|阶段|局游戏)[^，。；]{0,6}?限[一二三四五六七八九十两0-9]+次",
		"每(?:回合|轮)首次",
		"限[一二三四五六七八九十两0-9]+次",
		// A 组 · 阶段名（最短，放最后）
		"准备阶段",
		"判定阶段",
		"摸牌阶段",
		"出牌阶段",
		"弃牌阶段",
		"结束阶段",
	].join("|"),
	"g"
);

/**
 * 判断技能描述高亮是否开启
 * @returns {boolean} 是否开启（默认开启）
 */
function isEnabled() {
	return lib.config[`extension_十周年UI_${CONFIG_KEY}`] !== false;
}

/**
 * 为一段纯文本打上关键词标签
 * @param {string} text - 不含 HTML 标签的文本
 * @returns {string} 已插入 <span> 的文本
 * @private
 */
function markKeywords(text) {
	return text.replace(KEYWORD_RE, keyword => `<span class="${HL_CLASS}">${keyword}</span>`);
}

/**
 * 高亮技能描述中的时机与频率关键词
 * @description 描述文本可能已含内联 HTML（如 <font color=#f00>锁定技</font>），
 * 因此先按标签切分，只对文本片段做关键词替换，避免破坏标签结构。
 * 调用位置应在括号占位保护之后、括号还原之前。
 * @param {string} text - 技能描述（可能含 HTML）
 * @returns {string} 处理后的描述
 */
export function highlightSkillDescription(text) {
	if (!text || !isEnabled()) return text;

	return text.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, plain) => {
		if (tag) return tag;
		return markKeywords(plain);
	});
}
