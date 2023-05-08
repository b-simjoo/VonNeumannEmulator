"use strict";
// Syntax highlight for JS
const asm = (el) => {
    for (const node of el.children) {
        const s = node.innerText
            .replace(/(\/\/.*)/g, "<span class='comment'>$1</span>")
            .replace(/\b(load|store|add|and|jump|jumpz)(\s+)(\d+)/g, "<span class='func'>$1</span>$2<span class='param'>$3</span>")
            .replace(/\b(comp|lsl)/g, "<span class='func'>$1</span>")
            .replace(/^(\d+)/g, "<span class='number'>$1</span>");
        node.innerHTML = s.split("\n").join("<br/>");
    }
};
const Editor = (el, highlight = asm, tab = "    ") => {
    const caret = () => {
        const range = window.getSelection().getRangeAt(0);
        const prefix = range.cloneRange();
        prefix.selectNodeContents(el);
        prefix.setEnd(range.endContainer, range.endOffset);
        return prefix.toString().length;
    };
    const setCaret = (pos, parent = el) => {
        for (const node of parent.childNodes) {
            if (node.nodeType == Node.TEXT_NODE) {
                if (node.length >= pos) {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.setStart(node, pos);
                    range.collapse(true);
                    sel === null || sel === void 0 ? void 0 : sel.removeAllRanges();
                    sel === null || sel === void 0 ? void 0 : sel.addRange(range);
                    return -1;
                }
                else {
                    pos = pos - node.length;
                }
            }
            else {
                pos = setCaret(pos, node);
                if (pos < 0) {
                    return pos;
                }
            }
        }
        return pos;
    };
    highlight(el);
    el.addEventListener("keydown", (e) => {
        var _a;
        if (e.code === "Tab") {
            const pos = caret() + tab.length;
            const range = (_a = window.getSelection()) === null || _a === void 0 ? void 0 : _a.getRangeAt(0);
            range === null || range === void 0 ? void 0 : range.deleteContents();
            range === null || range === void 0 ? void 0 : range.insertNode(document.createTextNode(tab));
            highlight(el);
            setCaret(pos);
            e.preventDefault();
        }
    });
    el.addEventListener("keyup", (e) => {
        if (e.keyCode >= 0x30 || e.keyCode == 0x20) {
            const pos = caret();
            highlight(el);
            setCaret(pos);
        }
    });
};
