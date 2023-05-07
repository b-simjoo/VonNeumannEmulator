// Syntax highlight for JS

const asm = (el: HTMLElement) => {
  for (const node of el.children) {
    const s = (<HTMLElement>node).innerText
      .replace(/(\/\/.*)/g, "<span class='comment'>$1</span>")
      .replace(
        /\b(load|store|add|and|jump|jumpz)(\s+)(\d+)/g,
        "<span class='func'>$1</span>$2<span class='param'>$3</span>"
      )
      .replace(/\b(comp|lsl)/g, "<span class='func'>$1</span>")
      .replace(/^(\d+)/g, "<span class='number'>$1</span>");
    node.innerHTML = s.split("\n").join("<br/>");
  }
};

const editor = (el: HTMLElement, highlight = asm, tab = "    ") => {
  const caret = () => {
    const range = window.getSelection()!.getRangeAt(0);
    const prefix = range.cloneRange();
    prefix.selectNodeContents(el);
    prefix.setEnd(range.endContainer, range.endOffset);
    return prefix.toString().length;
  };

  const setCaret = (pos: number, parent = el) => {
    for (const node of parent.childNodes) {
      if (node.nodeType == Node.TEXT_NODE) {
        if ((<Text>node).length >= pos) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(node, pos);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
          return -1;
        } else {
          pos = pos - (<Text>node).length;
        }
      } else {
        pos = setCaret(pos, <HTMLElement>node);
        if (pos < 0) {
          return pos;
        }
      }
    }
    return pos;
  };

  highlight(el);

  el.addEventListener("keydown", (e) => {
    if (e.code === "Tab") {
      const pos = caret() + tab.length;
      const range = window.getSelection()?.getRangeAt(0);
      range?.deleteContents();
      range?.insertNode(document.createTextNode(tab));
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
