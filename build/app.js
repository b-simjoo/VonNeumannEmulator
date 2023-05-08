"use strict";
let diagram;
let editor;
let memory;
let state;
let ops = ["load", "store", "add", "and", "jump", "jumpz", "comp", "lsl"];
let RTLs = [
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "Load.T2: AR <- IR[11:0]",
        "Load.T3: DR <- Mem[AR]",
        "Load.T4: AC <- DR, SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "Store.T2: AR <- IR[11:0]",
        "Store.T3: Mem[AR] <- AC, SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "Add.T2: AR <- IR[11:0]",
        "Add.T2: DR <- Mem[AR]",
        "Add.T4: AC <- AC+DR, SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "And.T2: AR <- IR[11:0]",
        "And.T3: DR <- Mem[AR]",
        "And.T4: AC <- AC & DR, SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "Jump.T2: PC <- IR[11:0], SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "Jumpz.T2.z: PC <- IR[11:0], Jumpz.T2: SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "Comp.T3: AC <- ~AC, SC <- 0",
    ],
    [
        "T0: AR <- PC, PC <- PC+1",
        "T1: IR <- Mem[AR]",
        "LSL.T2: AC <- LSL(AC), SC <- 0",
    ],
];
let paramFunc = /^\s*(load|store|add|and|jump|jumpz)\s*(\d+)\s*(?:\/\/.*)?$/;
let noParamFunc = /^\s*(comp|lsl)\s*(?:\/\/.*)?$/;
let literal = /^\s*(\d+)\s*(?:\/\/.*)?$/;
let nothing = /^\s*(?:\/\/.*)?$/;
function asmbler(lines) {
    let res = new Array(4096);
    for (let index = 0; index < lines.length; index++) {
        let line = lines[index];
        let value = 0;
        if (paramFunc.test(line)) {
            let matches = line.match(paramFunc);
            value = (ops.indexOf(matches[1]) << 12) + parseInt(matches[2]);
        }
        else if (noParamFunc.test(line)) {
            let matches = line.match(noParamFunc);
            value = ops.indexOf(matches[1]) << 12;
        }
        else if (literal.test(line)) {
            value = parseInt(line.match(literal)[1]);
        }
        else if (nothing.test(line)) {
            value = 0;
        }
        else {
            return [false, index];
        }
        res[index] = value;
    }
    return [true, res];
}
function ce(tag, ...contents) {
    let elem;
    if (typeof tag === "string")
        elem = document.createElement(tag);
    else {
        elem = document.createElement(tag.tagName);
        elem.classList.add(...tag.cls);
    }
    contents.forEach((content) => {
        if (typeof content === "function")
            elem.append(...content());
        else
            elem.append(content);
    });
    return elem;
}
function renderMem(width = 13) {
    return ce("table", () => {
        let rows = [
            ce("tr", ce("th", " "), () => {
                let cols = [];
                for (let c = 0; c < width; c++) {
                    cols.push(ce("th", HEX(c)));
                }
                return cols;
            }),
        ];
        for (let i = 0; i < 4095; i += width) {
            rows.push(ce("tr", ce("td", HEX(i, 3)), () => {
                let cols = [];
                for (let c = 0; c < width; c++) {
                    cols.push(ce({
                        tagName: "td",
                        cls: diagram.Mem.memArray[i + c] ? [] : ["zero"],
                    }, HEX(diagram.Mem.memArray[i + c])));
                }
                return cols;
            }));
        }
        return rows;
    });
}
function resetMem() {
    var _a;
    memory === null || memory === void 0 ? void 0 : memory.remove();
    memory = renderMem();
    (_a = document.getElementById("memory")) === null || _a === void 0 ? void 0 : _a.append(memory);
    diagram.Mem.onArrayChange = (s, i, v) => {
        var _a;
        let td = (_a = memory === null || memory === void 0 ? void 0 : memory.childNodes[Math.floor(i / 13) + 1]) === null || _a === void 0 ? void 0 : _a.childNodes[(i % 13) + 1];
        td.classList.add("changed");
        if (v)
            td.classList.remove("zero");
        else
            td.classList.add("zero");
        td.innerText = HEX(v, 4);
        setTimeout(() => {
            td.classList.remove("changed");
        }, 5000);
    };
    if (state)
        state.innerText = `Memory cleared, Click Compile to load program`;
}
function compile() {
    let code = Array();
    editor === null || editor === void 0 ? void 0 : editor.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE)
            return;
        if (node.innerText !== "\n")
            code.push(node.innerText);
        else
            code.push("");
    });
    let [compiled, res] = asmbler(code);
    if (compiled) {
        diagram.loadMemArray(res);
        resetMem();
        if (state)
            state.innerText = `Ready. Click Run to start`;
    }
    else {
        console.error(`Error at line: ${res}`);
        if (state)
            state.innerText = `Error at line: ${res}`;
    }
    return compiled;
}
function tick() {
    diagram.tick();
    diagram.tick();
    if (state)
        state.innerText = RTLs[diagram.IncDec.output][diagram.SeqDec.output];
}
let interval;
function run() {
    let stopBtn = document.getElementById("pause");
    stopBtn.disabled = false;
    tick();
    interval = setTimeout(() => {
        run();
    }, timeout);
}
function stop() {
    let stopBtn = document.getElementById("pause");
    stopBtn.disabled = true;
    clearTimeout(interval);
}
function next() {
    tick();
}
function reset() {
    stop();
    diagram = new Diagram(diagram.diagramSVG);
    diagram.tick();
    diagram.CLKup = false;
    resetMem();
}
let timeout = 1000;
window.onload = function () {
    var _a;
    console.clear();
    let svg = ((_a = document.getElementById("diagram")) === null || _a === void 0 ? void 0 : _a.contentDocument);
    if (svg) {
        diagram = new Diagram(svg);
    }
    else
        throw new Error("Could not find diagram");
    // Turn div into an editor
    editor = document.getElementById("editor");
    if (editor) {
        Editor(editor);
        editor === null || editor === void 0 ? void 0 : editor.focus();
        compile();
    }
    else
        throw new Error("Could not find editor");
    state = document.getElementById("state");
    let speedSlider = document.getElementById("speed");
    if (speedSlider) {
        timeout = 11000 - speedSlider.valueAsNumber;
        let freq = document.getElementById("freq");
        if (freq)
            freq.innerHTML = `${Math.round(1000000 / timeout)} nHz`;
        console.log(`timeout: ${timeout}`);
        speedSlider.oninput = () => {
            timeout = 11000 - speedSlider.valueAsNumber;
            let freq = document.getElementById("freq");
            if (freq)
                freq.innerHTML = `${Math.round(1000000 / timeout)} nHz`;
            console.log(`timeout: ${timeout}`);
        };
    }
};
