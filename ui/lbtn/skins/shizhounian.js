/**
 * @fileoverview 十周年风格lbtn插件
 * 特点：十周年风格菜单、手牌整理、全选按钮
 */
import { lib, game, ui, get, ai, _status } from "noname";
import { createBaseLbtnPlugin } from "./base.js";

export function createShizhounianLbtnPlugin(lib, game, ui, get, ai, _status, app) {
	const base = createBaseLbtnPlugin(lib, game, ui, get, ai, _status, app);
	const assetPath = "extension/十周年UI/ui/assets/lbtn/";

	return {
		...base,
		skinName: "shizhounian",

		content(next) {
			lib.skill._uicardupdate = {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				unique: true,
				popup: false,
				silent: true,
				noLose: true,
				noGain: true,
				noDeprive: true,
				priority: -Infinity,
				filter: (event, player) => player === game.me,
				content() {
					ui.updateSkillControl?.(game.me, true);
				},
			};
		},

		precontent() {
			base.initBaseRewrites.call(this);
			this.initArenaReady();
		},

		initArenaReady() {
			const self = this;
			const setupScrollableArenaLog = () => {
				if (lib.config.extension_十周年UI_newDecadeStyle !== "dyon") return;
				if (game.log?._decadeUIKeepArenaLog !== 2) {
					const originalLog = game.log?._decadeUIOriginal || game.log;
					const wrappedLog = function (...args) {
						const arenaLog = ui.arenalog;
						const previous = lib.config.clear_log;
						lib.config.clear_log = false;
						arenaLog?.classList.add("decade-log-collecting");
						try {
							return originalLog.apply(this, args);
						} finally {
							lib.config.clear_log = previous;
							arenaLog?.classList.remove("decade-log-collecting");
						}
					};
					wrappedLog._decadeUIKeepArenaLog = 2;
					wrappedLog._decadeUIOriginal = originalLog;
					game.log = wrappedLog;
				}

				const arenaLog = ui.arenalog;
				if (!arenaLog || arenaLog._decadeUIScrollObserver) return;
				let followLatest = true;
				arenaLog.addEventListener(
					"scroll",
					() => {
						followLatest = arenaLog.scrollTop < 24;
					},
					{ passive: true },
				);
				arenaLog.addEventListener(
					"wheel",
					event => {
						if (!event.deltaY) return;
						const maxScroll = Math.max(0, arenaLog.scrollHeight - arenaLog.clientHeight);
						arenaLog.scrollTop = Math.max(0, Math.min(maxScroll, arenaLog.scrollTop + event.deltaY));
						followLatest = arenaLog.scrollTop < 24;
						event.preventDefault();
					},
					{ passive: false },
				);
				arenaLog._decadeUIScrollObserver = new MutationObserver(() => {
					if (followLatest) requestAnimationFrame(() => (arenaLog.scrollTop = 0));
				});
				arenaLog._decadeUIScrollObserver.observe(arenaLog, { childList: true });
			};
			// 兼容旧版/重复加载造成的后台设置按钮残留，只保留第一个节点。
			const dedupeSettingButtons = () => {
				if (!ui.arena) return;
				for (const selector of [".settingButton", ".tuoguanButton"]) {
					const buttons = ui.arena.querySelectorAll(selector);
					for (let i = 1; i < buttons.length; i++) buttons[i].remove();
				}
			};
			dedupeSettingButtons();
			if (ui.arena && !ui.arena._decadeUIDedupeSettingButtons) {
				ui.arena._decadeUIDedupeSettingButtons = new MutationObserver(dedupeSettingButtons);
				ui.arena._decadeUIDedupeSettingButtons.observe(ui.arena, { childList: true, subtree: true });
			}
			const syncDyonPhaseGlow = () => {
				if (lib.config.extension_十周年UI_newDecadeStyle !== "dyon" || !ui.arena) return;
				const phase = _status.currentPhase || game.currentPhase;
				ui.arena.querySelectorAll(".player.dyon-phase-glow").forEach(player => {
					if (player !== phase) player.classList.remove("dyon-phase-glow");
				});
				if (phase?.parentNode === ui.arena) phase.classList.add("dyon-phase-glow");
			};
			if (ui.arena && !ui.arena._decadeUIDyonPhaseGlowTimer) {
				ui.arena._decadeUIDyonPhaseGlowTimer = setInterval(syncDyonPhaseGlow, 250);
				lib.onover?.push?.(() => {
					clearInterval(ui.arena._decadeUIDyonPhaseGlowTimer);
					delete ui.arena._decadeUIDyonPhaseGlowTimer;
				});
			}
			lib.arenaReady.push(() => {
				setupScrollableArenaLog();
				dedupeSettingButtons();
				if (!ui.arena?._decadeUIDyonPhaseGlowTimer && ui.arena) {
					ui.arena._decadeUIDyonPhaseGlowTimer = setInterval(syncDyonPhaseGlow, 250);
				}
				self.initRoundUpdate();

				// 问号按钮
				if (self.supportedModes.includes(lib.config.mode)) {
					self.createQuestionButton();
				}

				// 整理手牌按钮
				self.createSortButton();

				// 右上角菜单
				self.createTopRightMenu();
			});
		},

		// 创建问号按钮
		createQuestionButton() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const bottomOffset = isTouch ? "calc(100% - 55px)" : "calc(100% - 105px)";
			// 旧版按钮和重复初始化可能同时留下两个问号，只保留当前皮肤创建的一个。
			document.querySelectorAll('img[src$="/CD/wenhao.png"], img[src$="/CD/new_wenhao.png"]').forEach(node => {
				node._decadeUIVisibilityObserver?.disconnect();
				node.remove();
			});

			const btn = ui.create.node("img");
			btn.classList.add("decade-question-button");
			btn.src = `${lib.assetURL}${assetPath}CD/wenhao.png`;
			btn.style.cssText = `display:block;width:40px;height:29px;position:absolute;bottom:${bottomOffset};right:60px;left:auto;background-color:transparent;z-index:3;`;

			const syncVisibility = () => {
				const menuOpen =
					ui.arena?.classList.contains("menupaused") ||
					(ui.menuContainer && !ui.menuContainer.classList.contains("hidden"));
				btn.style.display = menuOpen ? "none" : "block";
			};
			const visibilityObserver = new MutationObserver(syncVisibility);
			[ui.arena, ui.menuContainer].filter(Boolean).forEach(node =>
				visibilityObserver.observe(node, { attributes: true, attributeFilter: ["class"] }),
			);
			btn._decadeUIVisibilityObserver = visibilityObserver;
			syncVisibility();

			btn.onclick = () => {
				const container = ui.create.div(".popup-container", ui.window);
				game.playAudio(`../${assetPath}shousha/label.mp3`);

				const mode = lib.config.mode;
				if (mode === "identity") {
					const cls = self.identityTips[game.me?.identity];
					if (cls) ui.create.div(cls, container);
				} else if (mode === "doudizhu") {
					const cls = self.doudizhuTips[game.me?.identity];
					if (cls) ui.create.div(cls, container);
				} else if (mode === "versus") {
					ui.create.div(".Tiphu", container);
				} else if (mode === "guozhan") {
					const cls = self.groupTips[game.me?.group] || ".Tipweizhi";
					ui.create.div(cls, container);
				}

				container.addEventListener("click", () => {
					game.playAudio(`../${assetPath}shousha/caidan.mp3`);
					container.delete(200);
				});
			};

			document.body.appendChild(btn);
		},

		// 创建整理手牌按钮
		createSortButton() {
			const self = this;
			const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
			const isTouch = lib.config.phonelayout;
			const sortImg = isTouch ? "zhengli.png" : "zhenglix.png";

			let style;
			if (isTouch) {
				style = isRight
					? `display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 35px);left:calc(100% - 380px);background-color:transparent;z-index:7;`
					: `display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 35px);left:calc(100% - 1260px);background-color:transparent;z-index:7;`;
			} else {
				style = isRight
					? `display:block;--w:45px;--h:calc(var(--w)*110/170);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 45px);left:calc(100% - 305px);background-color:transparent;z-index:7;`
					: `display:block;--w:88px;--h:calc(var(--w)*81/247);width:var(--w);height:var(--h);position:absolute;top:calc(100% - 33px);right:calc(100% - 367.2px);background-color:transparent;z-index:4;`;
			}

			const btn = ui.create.node("img");
			btn.classList.add("decade-sort-button");
			btn.src = `${lib.assetURL}${assetPath}uibutton/${sortImg}`;
			btn.style.cssText = style;
			btn.style.display = "none";

			btn.onclick = () => self.sortHandCards();

			// 定时检测手牌数
			setInterval(() => {
				btn.style.display = game.me?.getCards("hs").length >= 4 ? "block" : "none";
			}, 1000);

			document.body.appendChild(btn);
		},

		// 创建右上角菜单
		createTopRightMenu() {
			const self = this;
			const isTouch = lib.config.phonelayout;
			const topOffset = isTouch ? "10px" : "60px";
			// 与问号按钮一样，菜单图标只保留一个，避免旧版节点叠加。
			document.querySelectorAll('img[src$="/CD/button3.png"], img[src$="/CD/new_button3.png"]').forEach(node => node.remove());

			// 阴影背景
			const shadow = ui.create.node("img");
			shadow.src = `${lib.assetURL}${assetPath}uibutton/yinying.png`;
			shadow.style.cssText = "display:block;width:100%;height:30%;position:absolute;bottom:0px;background-color:transparent;z-index:-4;";
			document.body.appendChild(shadow);

			// 菜单按钮
			const menuBtn = ui.create.node("img");
			menuBtn.classList.add("decade-menu-button");
			menuBtn.src = `${lib.assetURL}${assetPath}CD/button3.png`;
			menuBtn.style.cssText = `display:block;--w:56px;--h:calc(var(--w)*74/71);width:var(--w);height:var(--h);position:absolute;top:${topOffset};right:0;background-color:transparent;z-index:5;`;
			document.body.appendChild(menuBtn);

			let menuPopup = null;

			const openMenu = () => {
				if (menuPopup) return;
				game.playAudio(`../${assetPath}CD/click.mp3`);

				menuPopup = ui.create.div(".popup-container", { background: "rgb(0,0,0,0)" }, ui.window);
				menuPopup.addEventListener("click", e => {
					game.playAudio(`../${assetPath}CD/back.mp3`);
					e.stopPropagation();
					closeMenu();
				});

				ui.create.div(".HOME", menuPopup);

				// 设置按钮
				const szBtn = ui.create.div(".SZ", menuPopup);
				szBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					ui.click.configMenu?.();
					ui.system1.classList.remove("shown");
					ui.system2.classList.remove("shown");
					closeMenu();
				});

				// 离开按钮
				const lkBtn = ui.create.div(".LK", menuPopup);
				lkBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					window.location.reload();
				});

				// 背景按钮
				const bjBtn = ui.create.div(".BJ", menuPopup);
				bjBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					self.openBackgroundSelector(`../${assetPath}shousha/caidan.mp3`);
				});

				// 投降按钮
				const txBtn = ui.create.div(".TX", menuPopup);
				txBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					game.over();
				});

				// 托管按钮
				const tgBtn = ui.create.div(".TG", menuPopup);
				tgBtn.addEventListener("click", () => {
					game.playAudio(`../${assetPath}CD/button.mp3`);
					ui.click.auto();
				});
			};

			const closeMenu = () => {
				if (menuPopup) {
					menuPopup.delete(200);
					menuPopup = null;
				}
			};

			menuBtn.onclick = () => (menuPopup ? closeMenu() : openMenu());
		},

		create: {
			control() {},

			confirm() {
				return base.create.confirm();
			},

			cardRoundTime() {
				return base.create.cardRoundTime();
			},

			handcardNumber() {
				const isRight = lib.config["extension_十周年UI_rightLayout"] === "on";
				const isTouch = lib.config.phonelayout;
				const arena = ui.arena;
				const className = isRight ? ".handcardNumber" : ".handcardNumber1";

				// 回放和 arenaReady 都可能触发创建逻辑，已有节点直接复用。
				const existing = arena?.querySelector?.(className);
				if (existing?.node?.cardNumber) return existing;

				// 设置按钮

				// 功能按钮（仅触屏布局）
				if (isTouch) {
					if (isRight) {
						ui.create.div(".huanfuButton_new", ui.arena, base.click.huanfu);
						ui.create.div(".jiluButton_new", ui.arena, ui.click.pause);
						ui.create.div(".meiguiButton_new", ui.arena, ui.click.pause);
						ui.create.div(".xiaolianButton_new", ui.arena, ui.click.pause);
					} else {
						ui.create.div(".huanfuButton_new1", ui.arena, base.click.huanfu);
						ui.create.div(".jiluButton_new1", ui.arena, ui.click.pause);
						ui.create.div(".meiguiButton_new1", ui.arena, ui.click.pause);
						ui.create.div(".xiaolianButton_new1", ui.arena, ui.click.pause);
					}
				}

				// 托管按钮只保留一个，避免重复初始化产生两个齿轮按钮。
				if (arena) {
					const controls = arena.querySelectorAll(".tuoguanButton");
					for (let i = 1; i < controls.length; i++) controls[i].remove();
				}
				if (arena && !arena.querySelector(".tuoguanButton")) {
					ui.create.div(".tuoguanButton", arena, ui.click.auto);
				}

				// 手牌数量
				const node = ui.create.div(className, arena).hide();
				node.node = {
					cardPicture: ui.create.div(".cardPicture", node),
					cardNumber: ui.create.div(".cardNumber", node),
				};

				node.updateCardnumber = function () {
					if (!game.me) return;
					const current = game.me.countCards("h") || 0;
					const limit = game.me.getHandcardLimit() || 0;
					const color = current > limit ? "red" : "white";
					const displayLimit = limit === Infinity ? "∞" : limit;

					this.node.cardNumber.innerHTML = `<span><font color="${color}">${current}</font><sp style="font-size:15px;font-family:yuanli;color:#FFFCF5;">/</sp>${displayLimit}</span>`;
					this.show();
					game.addVideo("updateCardnumber", null, { cardNumber: limit });
				};

				node.node.cardNumber.interval = setInterval(() => ui.handcardNumber?.updateCardnumber(), 1000);
				game.addVideo("createhandcardNumber");
				return node;
			},
		},
	};
}
