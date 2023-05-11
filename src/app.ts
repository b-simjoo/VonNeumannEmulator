// import * as bootstrap from "bootstrap";
import { Diagram, HEX } from "./diagram";
import { Editor } from "./codeEditor";

let diagram: Diagram;
let editor: HTMLElement | null;
let memory: HTMLElement | null;
let memBoxWidth = 1;
let state: HTMLElement | null;
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

function asmbler(lines: string[]): [true, number[]] | [false, number] {
  let res = new Array<number>(4096);
  for (let index = 0; index < lines.length; index++) {
    let line = lines[index];
    let value = 0;
    if (paramFunc.test(line)) {
      let matches = line.match(paramFunc);
      value = (ops.indexOf(matches![1]) << 12) + parseInt(matches![2]);
    } else if (noParamFunc.test(line)) {
      let matches = line.match(noParamFunc);
      value = ops.indexOf(matches![1]) << 12;
    } else if (literal.test(line)) {
      value = parseInt(line.match(literal)![1]);
    } else if (nothing.test(line)) {
      value = 0;
    } else {
      return [false, index];
    }
    res[index] = value;
  }
  return [true, res];
}

function ce(
  tag: string | { tagName: string; cls: string[] },
  ...contents: (string | Node | (() => Node[]))[]
): Node {
  let elem: HTMLElement;
  if (typeof tag === "string") elem = document.createElement(tag);
  else {
    elem = document.createElement(tag.tagName);
    elem.classList.add(...tag.cls);
  }
  contents.forEach((content) => {
    if (typeof content === "function") elem.append(...content());
    else elem.append(content);
  });
  return <Node>elem;
}

function renderMem() {
  return ce("table", () => {
    let rows = [
      // ce("tr", ce("th", " "), () => {
      //   let cols = [];
      //   for (let c = 0; c < memBoxWidth; c++) {
      //     cols.push(ce("th", HEX(c)));
      //   }
      //   return cols;
      // }),
      ce("thead", () => {
        let header = ce("td", "Memory");
        (<HTMLElement>header).setAttribute("colspan", "2");
        return [header];
      }),
    ];
    for (let i = 0; i < 4095; i += memBoxWidth) {
      rows.push(
        ce("tr", ce({ tagName: "td", cls: ["addr"] }, HEX(i, 3)), () => {
          let cols = [];
          for (let c = 0; c < memBoxWidth; c++) {
            cols.push(
              ce(
                {
                  tagName: "td",
                  cls: diagram.Mem.memArray[i + c]
                    ? ["data"]
                    : ["data", "zero"],
                },
                HEX(diagram.Mem.memArray[i + c])
              )
            );
          }
          return cols;
        })
      );
    }
    return rows;
  });
}

function resetMem() {
  memory?.remove();
  memory = <HTMLElement>renderMem();
  document.getElementById("memory")?.append(memory);
  diagram.Mem.onArrayChange = (s, i, v) => {
    let changedTr = memory?.childNodes[Math.floor(i / memBoxWidth) + 1];
    let changedTd = changedTr?.childNodes[1];
    (<HTMLElement>changedTr).classList.add("changed");
    if (v) (<HTMLElement>changedTd).classList.remove("zero");
    else (<HTMLElement>changedTd).classList.add("zero");
    (<HTMLElement>changedTd).innerText = HEX(v, 4);
    (<HTMLElement>changedTr)?.scrollIntoView({ block: "center" });
    setTimeout(() => {
      (<HTMLElement>changedTr).classList.remove("changed");
    }, 5000);
  };
  if (state) state.innerText = `Memory cleared, Click Compile to load program`;
}

export function compile() {
  let code = Array<string>();
  editor?.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if ((<HTMLElement>node).innerText !== "\n")
      code.push((<HTMLElement>node).innerText);
    else code.push("");
  });
  let [compiled, res] = asmbler(code);
  if (compiled) {
    diagram.loadMemArray(<number[]>res);
    resetMem();

    if (state) state.innerText = `Ready. Click Run to start`;
  } else {
    console.error(`Error at line: ${res}`);
    if (state) state.innerText = `Error at line: ${res}`;
  }
  return compiled;
}

function tick() {
  diagram.tick();
  if (state)
    state.innerText = RTLs[diagram.IncDec.output][diagram.SeqDec.output];
}

let interval: number;

export function run() {
  let stopBtn = <HTMLInputElement>document.getElementById("btn-pause");
  stopBtn.disabled = false;
  tick();
  interval = setTimeout(() => {
    run();
  }, timeout);
}

export function stop() {
  let stopBtn = <HTMLInputElement>document.getElementById("btn-pause");
  stopBtn.disabled = true;
  clearTimeout(interval);
}

export function next() {
  tick();
}

export function reset() {
  stop();
  diagram = new Diagram(diagram.diagramSVG);
  diagram.signals();
  resetMem();
}

let timeout = 1000;

function changeTimeout() {
  timeout =
    10500 -
    (<HTMLInputElement>document.getElementById("rng-speed"))?.valueAsNumber;
  let freq = document.getElementById("freq");
  if (freq) freq.innerHTML = `${Math.round(1000000 / timeout)} nHz`;
  console.log(`timeout: ${timeout}`);
}

const height = window.innerHeight;

function main() {
  document.body.style.height = height.toString() + "px";
  console.clear();
  let svg = <XMLDocument>(
    (<HTMLObjectElement>document.getElementById("diagram"))?.contentDocument
  );
  if (svg) {
    diagram = new Diagram(svg);
  } else throw new Error("Could not find diagram");

  // Turn div into an editor
  editor = document.getElementById("editor");
  if (editor) {
    Editor(editor);
    editor?.focus();
    compile();
  } else throw new Error("Could not find editor");
  state = document.getElementById("state");
  let speedSlider = document.getElementById("rng-speed");
  if (speedSlider) {
    timeout = 10500 - (<HTMLInputElement>speedSlider).valueAsNumber;
    let freq = document.getElementById("freq");
    if (freq) freq.innerHTML = `${Math.round(1000000 / timeout)} nHz`;
  }
}

window.addEventListener("load", main);
document.getElementById("btn-compile")?.addEventListener("click", compile);
document.getElementById("btn-run")?.addEventListener("click", run);
document.getElementById("btn-reset")?.addEventListener("click", reset);
document.getElementById("btn-pause")?.addEventListener("click", stop);
document.getElementById("rng-speed")?.addEventListener("input", changeTimeout);
