#! /usr/bin/env node
const blessed = require("blessed");
const fs = require("fs");
const child_process = require("child_process");
const os = require("os");

// get config
const configPath = `${os.homedir()}/.config/spotlighttui/`;
const previousConfigPath = `${os.homedir()}/.config/spotlightui/`;

const [config, validConfig] = ((path) => {
	let config = {}
	let validConfig = false
	if (path !== null) {
		config = JSON.parse(fs.readFileSync(path + "/config.json").toString());
		validConfig = Array.isArray(config.shortcuts);
		if (validConfig) {
			config.pinned = [];
			config.shortcuts.forEach((shortcut, index) => {
				if (Boolean(shortcut.pinned) === true) config.pinned.push(index);
			});
		}
	}
	return [config, validConfig]
})(fs.existsSync(configPath) ? configPath : (fs.existsSync(previousConfigPath) ? previousConfigPath : null))

const screen = blessed.screen({ smartCSR: true });
screen.key(["escape", "q", "C-c"], function (ch, key) {
	return process.exit(0);
});

function center(text, length) {
	if (text.length > length) return text.substring(0, length - 2);
	else {
		const half = Math.floor((length - text.length) / 2);
		return `${new Array(half).join(" ")}${text}${new Array(half + 1).join(
			" "
		)}`;
	}
}

if (validConfig) {
	// shortcuts
	const shortcuts = blessed.layout({
		top: "25%",
		left: "center",
		width: "75%",
		height: 8,
		content: "",
		tags: true,
		border: {
			type: "bg",
		},
		style: {
			fg: "gray",
			bg: blessed.colors.default,
			border: {
				fg: "#f0f0f0",
			},
		},
		children: [],
	});

	screen.append(shortcuts);

	function generateShortcut(shortcut, index) {
		const element = blessed.text({
			top: 4,
			left: "center",
			width: 14,
			height: 10,
			content:
				"\n\n\n\n" +
				center(typeof shortcut.name === "string" ? shortcut.name : "", 14),
			tags: true,
			border: {
				type: "bg",
			},
			style: {
				fg:
					typeof shortcut.foreground === "string" ? shortcut.foreground : "black",
				bg:
					typeof shortcut.background === "string" ? shortcut.background : "white",
				bold: true,
			},
		});
		return element;
	}

	let selectionPos = 0;
	let displayedShortcuts = [];
	function displayShortcuts(...indexes) {
		while (shortcuts.children.length > 0) {
			shortcuts.children[0].destroy();
		}
		displayedShortcuts = [];
		indexes.forEach((index) => {
			if (typeof index !== "number") return;
			if (typeof config.shortcuts[index] !== "object") return;
			const shortcut = config.shortcuts[index];
			const generatedShortcut = [generateShortcut(shortcut), index];
			if (Boolean(shortcut.pinned) === true)
				displayedShortcuts.unshift(generatedShortcut);
			else displayedShortcuts.push(generatedShortcut);
		});

		if (displayedShortcuts.length <= selectionPos)
			selectionPos = displayShortcuts.length - 1;
		if (selectionPos < 0) selectionPos = 0;
		if (displayedShortcuts.length !== 0) {
			displayedShortcuts[selectionPos][0].style.bold = false;
			displayedShortcuts[selectionPos][0].style.border.bg =
				displayedShortcuts[selectionPos][0].style.bg;
		}

		// for (let index = displayedShortcuts.length - 1; index >= 0; index--) shortcuts.append(displayedShortcuts[index][0])
		displayedShortcuts.forEach((shortcut) => shortcuts.append(shortcut[0]));
		screen.render();
	}

	// text box
	let isSearching = false;
	const input = blessed.text({
		top: "10%",
		left: "center",
		width: "75%",
		height: 5,
		content: "",
		tags: true,
		border: {
			type: "bg",
		},
		style: {
			fg: "white",
			bg: "black",
			border: { fg: "#f0f0f0" },
		}
	});
	const fixedContent = "\n   ";
	const searchKeys = "abcdefghijklmnopqrstuvwxyz1234567890"
		.split("")
		.concat(["space"]);
	let content = "";
	let previousContent = null;
	let caretPos = 0;
	let caret = "";

	function render() {
		isSearching = content.length > 0;

		if (isSearching) {
			let _content =
				caret !== ""
					? content.substring(0, caretPos) +
					caret +
					content.substring(caretPos + 1)
					: content;
			input.content = fixedContent + `{bold}${_content}{/bold}`;
		}
		if (previousContent !== content) {
			if (isSearching) {
				const query = content.split(" ");
				const indexes = [];
				config.shortcuts.forEach((shortcut, index) => {
					let result = false;
					for (let index = 0; index < query.length; index++) {
						const text = query[index];
						if (typeof shortcut.name === "string") {
							if (shortcut.name.replace(text, "") !== shortcut.name)
								result = true;
						}
						if (typeof shortcut.tags === "string") {
							if (shortcut.tags.replace(text, "") !== shortcut.tags)
								result = true;
						}

						if (result) break;
					}
					if (result) indexes.push(index);
				});
				displayShortcuts(...indexes);
			} else {
				input.content = fixedContent + "search";
				displayShortcuts(...config.pinned);
			}
			previousContent = config;
		}
		screen.render();
	}

	// caret
	setInterval(function () {
		if (!isSearching) return;
		caret = caret === "█" ? "" : "█";
		render();
	}, 500);

	// key handler
	function selectionOverflowed() {
		if (displayedShortcuts.length === 0 || selectionPos !== 0) return false;
		return (
			displayedShortcuts[displayedShortcuts.length - 1][0].rleft ===
			displayedShortcuts[selectionPos][0].rleft
		);
	}
	function selectRight() {
		selectionPos =
			displayedShortcuts.length <= selectionPos + 1 ? 0 : selectionPos + 1;
		if (selectionOverflowed()) selectionPos = 0;
	}
	function selectLeft() {
		selectionPos =
			selectionPos > 0 ? selectionPos - 1 : displayedShortcuts.length - 1;
		if (selectionOverflowed()) selectionPos = displayedShortcuts.length - 1;
	}

	screen.on("keypress", function (ch, key) {
		(() => {
			if (searchKeys.includes(key.full)) {
				content =
					content.substring(0, caretPos) + ch + content.substring(caretPos);
				caretPos += 1;
			} else if (key.full === "backspace") {
				content =
					content.substring(0, caretPos - 1) + content.substring(caretPos);
				caretPos -= caretPos > 0 ? 1 : 0;
			} else if (!isSearching) return;
			else if (key.full === "left") caretPos -= caretPos > 0 ? 1 : 0;
			else if (key.full === "right")
				caretPos += content.length < caretPos ? 0 : 1;
		})();
		(() => {
			if (key.full === "up" || (!isSearching && key.full === "left"))
				selectLeft();
			else if (key.full === "down" || (!isSearching && key.full === "right"))
				selectRight();
			else if (key.full === "enter" && displayedShortcuts.length !== 0) {
				const execute =
					config.shortcuts[displayedShortcuts[selectionPos][1]].execute;
				if (!Array.isArray(execute)) return;
				child_process.exec(execute.join("\\\n"));
			}
		})();
		render();
	});

	screen.append(input);
	render();

} else {
	// display error if config not found or invalid
	const message = blessed.text({
		top: "center",
		left: "center",
		width: "75%",
		height: 5,
		content: "\n",
		tags: true,
		border: {
			type: "bg",
		},
		style: {
			fg: "white",
			bg: "black",
			border: { fg: "#f0f0f0" },
			align: "center"
		}
	})
	screen.append(message)
	message.content += center("'~/.config/spotlighttui/config.json' has to be valid.", message.width)
	screen.render()
}