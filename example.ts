let diagram: Diagram;

function asmbler(asmCode: string[]): number[] {
  let res = new Array<number>(4096);
  asmCode.forEach((line, index) => {
    if (line.length == 0) res[index] = 0;
    else if (line.split(" ").length == 2) {
      let ops = ["load", "store", "add", "and", "jump", "jumpz", "comp", "lsl"];
      let tokens = line.split(" ");
      let opcode = tokens[0];
      let arg = tokens[1];
      res[index] = ops.indexOf(opcode) << (12 + parseInt(arg));
    } else res[index] = parseInt(line);
  });
  return res;
}

window.onload = function () {
  let svg = <XMLDocument>(
    (<HTMLObjectElement>document.getElementById("diagram"))?.contentDocument
  );
  if (svg) {
    diagram = new Diagram(svg);
  } else throw new Error("Could not find diagram");

  diagram.loadMemArray(
    asmbler(["load 6", "add 7", "store 8", "jump 3", "", "5", "4", "0", ""])
  );
  for (let i = 0; i < 100; i++) {
    diagram.tick();
  }
  console.log(diagram.Mem.memArray);
};
