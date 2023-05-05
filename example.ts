let diagram: Diagram;
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
    "Jumpx.T2: PC <- IR[11:0], SC <- 0",
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

function asmbler(asmCode: string[]): number[] {
  let res = new Array<number>(4096);
  asmCode.forEach((line, index) => {
    if (line.length == 0) res[index] = 0;
    else if (line.split(" ").length == 2) {
      let tokens = line.split(" ");
      let opcode = tokens[0];
      let arg = tokens[1];
      res[index] = (ops.indexOf(opcode) << 12) + parseInt(arg);
    } else res[index] = parseInt(line);
  });
  return res;
}

window.onload = function () {
  console.clear();
  let svg = <XMLDocument>(
    (<HTMLObjectElement>document.getElementById("diagram"))?.contentDocument
  );
  if (svg) {
    diagram = new Diagram(svg);
  } else throw new Error("Could not find diagram");

  diagram.loadMemArray(
    asmbler(["load 6", "add 7", "store 8", "jump 3", "", "", "5", "4"])
  );
  for (let i = 0; i < 100; i++) {
    console.log(
      "================== clock: " +
        i +
        "  T" +
        diagram.SC.output +
        "  " +
        ops[diagram.IncDec.output]
    );
    diagram.tick();
  }
  console.log(diagram.Mem.memArray);
};
