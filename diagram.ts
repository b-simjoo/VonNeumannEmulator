//let diagram: XMLDocument;

type OutputCallback = (sender: Component, value: number) => void;
type ID = string | null;
type IDs = Array<string> | null;

abstract class Component {
  public onOutputChange: OutputCallback | null = null;
  public diagram: Diagram;
  private _output: number = 0;
  constructor(diagram: Diagram) {
    this.diagram = diagram;
  }

  public abstract onOutputChanged(): void;

  public get output(): number {
    return this._output;
  }

  protected set output(value) {
    if (this._output !== value) {
      this._output = value;
      this.onOutputChanged();
      this.onOutputChange?.(this, value);
    }
  }
}

class CommonBus extends Component {
  public outNUM: string | Array<string> | null;
  public selectNUM: string | Array<string> | null;
  public inputsLEDs: Array<string> | null;

  private inputs: Array<number>;
  private _select = 0;

  constructor(
    diagram: Diagram,
    outNUM: string | Array<string> | null,
    selectNUM: string | Array<string> | null,
    inputsLEDs: Array<string> | null,
    select = 0,
    inputCount = 8
  ) {
    super(diagram);
    this.outNUM = outNUM;
    this.selectNUM = selectNUM;
    this.inputsLEDs = inputsLEDs;
    this.inputs = Array<number>(inputCount);
    this.select = select;
  }

  public set select(value: number) {
    this._select = value;
    if (this.selectNUM) this.diagram.dig_write(this.selectNUM, this._select, 1);
    this.inputsLEDs?.forEach((LEDid, index) => {
      if (this.select == index) this.diagram.high(LEDid);
      else this.diagram.low(LEDid);
    });
    this.output = this.inputs[value] || 0;
  }

  public setInput(index: number, value: number) {
    this.inputs[index] = value;
    if (this._select == index) this.select = index; //update select
  }

  public onOutputChanged() {
    if (this.outNUM) this.diagram.dig_write(this.outNUM, this.output, 4);
  }
}

class Memory extends Component {
  public WE: boolean = false;
  public data: number = 0;
  public onArrayChange: ((sender: Memory) => void) | null = null;

  private _addr: number = 0;
  private memArray: Array<number>;

  public outputNUM: string | Array<string> | null;

  constructor(
    diagram: Diagram,
    outputNUM: string | Array<string> | null,
    memSize = 4096,
    content: Array<number> | null = null
  ) {
    super(diagram);
    this.outputNUM = outputNUM;

    if (content && content.length === memSize) this.memArray = content;
    else this.memArray = Array<number>(memSize);
  }

  public set addr(value: number) {
    this._addr = value;
    this.output = this.memArray[value] || 0;
  }

  public tick(): void {
    this.output = this.memArray[this._addr] || 0; //update output on uprise clock
    if (this.WE) {
      this.memArray[this._addr] = this.data;
      this.onArrayChange?.(this);
    }
  }

  public onOutputChanged(): void {
    if (this.outputNUM) {
      this.diagram.dig_write(this.outputNUM, this.output, 4);
    }
  }
}

class Register extends Component {
  public load: boolean = false;
  public en: boolean;
  public rst: boolean = false;
  public data: number = 0;
  public nibbleCount: number;

  private value: number = 0;
  private maximum: number;

  public valueNUM: string | Array<string> | null;
  public outputNUM: string | Array<string> | null;

  constructor(
    diagram: Diagram,
    valueNUM: string | Array<string> | null,
    outputNUM: string | Array<string> | null,
    en = false,
    nibbleCount = 4,
    bitCount = 16
  ) {
    super(diagram);
    this.en = en;
    this.maximum = Math.pow(2, bitCount);
    this.nibbleCount = nibbleCount;
    this.valueNUM = valueNUM;
    this.outputNUM = outputNUM;
  }

  public tick(): void {
    let tmp = this.value;
    if (this.en) this.value = (this.value + 1) % this.maximum;
    if (this.load) this.value = this.data;
    if (this.rst) this.value = 0;
    this.output = tmp;
  }

  public onOutputChanged() {
    if (this.valueNUM)
      this.diagram.dig_write(this.valueNUM, this.value, this.nibbleCount);

    if (this.outputNUM)
      this.diagram.dig_write(this.outputNUM, this.output, this.nibbleCount);
  }
}

class Counter extends Register {
  constructor(
    diagram: Diagram,
    valueNUM: string | Array<string> | null,
    outputNUM: string | Array<string> | null,
    nibbleCount = 4,
    bitCount = 16
  ) {
    super(diagram, valueNUM, outputNUM, true, nibbleCount, bitCount);
  }
}

class ALU extends Component {
  private _portA: number = 0;
  private _portB: number = 0;
  private _func: number = 0;
  private functions = [
    (a: number, b: number) => a + b,
    (a: number, b: number) => a & b,
    (a: number, b: number) => ~a,
    (a: number, b: number) => a << 1,
    (a: number, b: number) => b,
  ];

  private functionNames = ["ADD", "AND", "NOT", "LSL", "---"];

  public outNUM: string | Array<string> | null;
  public funcName: string | Array<string> | null;

  constructor(
    diagram: Diagram,
    outNUM: string | Array<string> | null,
    funcName: string | Array<string> | null
  ) {
    super(diagram);
    this.outNUM = outNUM;
    this.funcName = funcName;
  }

  public set portA(value: number) {
    this._portA = value;
    this.output = this.functions[this._func](this._portA, this._portB);
  }

  public set portB(value: number) {
    this._portB = value;
    this.output = this.functions[this._func](this._portA, this._portB);
  }

  public set func(value: number) {
    this._func = value;
    if (this.funcName)
      this.diagram.changeText(
        this.funcName,
        "func: " + this.functionNames[this._func]
      );
    this.output = this.functions[this._func](this._portA, this._portB);
  }

  public onOutputChanged() {
    if (this.outNUM) this.diagram.dig_write(this.outNUM, this.output, 4);
  }
}

class Decoder extends Component {
  public outputLEDs: Array<string> | null;

  constructor(
    diagram: Diagram,
    outputLEDs: Array<string> | null,
    outputLabels: Array<string>
  ) {
    super(diagram);
    this.outputLEDs = outputLEDs;
    if (outputLEDs) this.diagram.high(outputLEDs[0]);
    outputLabels.forEach((label, index) =>
      Object.defineProperty(this, label, {
        get() {
          return this.output === index;
        },
      })
    );
  }

  public set input(value: number) {
    this.output = value;
  }

  public onOutputChanged(): void {
    this.outputLEDs?.forEach((LEDId, index) => {
      if (this.output == index) this.diagram.high(LEDId);
      else this.diagram.low(LEDId);
    });
  }
}

class Encoder extends Component {
  public inputLEDIds: Array<string> | null;
  public outNum: string | Array<string> | null;
  public nibbleCount: number;
  private inputs: Array<boolean>;

  constructor(
    diagram: Diagram,
    inputLEDIds: Array<string> | null,
    outNum: string | Array<string> | null,
    nibbleCount = 1,
    inputCount = 5
  ) {
    super(diagram);
    this.inputLEDIds = inputLEDIds;
    this.outNum = outNum;
    this.nibbleCount = nibbleCount;
    this.inputs = Array<boolean>(inputCount);
  }

  public setInput(key: number, value: boolean) {
    this.inputs[key] = value;
    //priority encoder:
    for (let i: number = 0; i < this.inputs.length; i++) {
      if (this.inputs[i]) {
        this.output = i;
        return;
      }
    }
    this.output = 0;
  }

  public onOutputChanged(): void {
    this.inputLEDIds?.forEach((id, i) => {
      if (this.inputs[i]) this.diagram.high(id);
      else this.diagram.low(id);
    });

    if (this.outNum)
      this.diagram.dig_write(this.outNum, this.output, this.nibbleCount);
  }
}

class ACz extends Component {
  public outputLed: string | Array<string> | null;
  constructor(diagram: Diagram, outputLed: string | Array<string> | null) {
    super(diagram);
    this.outputLed = outputLed;
  }

  public set input(value: number) {
    this.output = value == 0 ? 1 : 0;
  }

  public onOutputChanged() {
    if (this.outputLed) {
      if (this.output) this.diagram.high(this.outputLed);
      else this.diagram.low(this.outputLed);
    }
  }
}

class I extends Component {
  public outputLed: string | Array<string> | null;
  public inputLed: string | Array<string> | null;
  constructor(
    diagram: Diagram,
    outputLed: string | Array<string> | null,
    inputLed: string | Array<string> | null
  ) {
    super(diagram);
    this.outputLed = outputLed;
    this.inputLed = inputLed;
  }

  public set input(value: number) {
    this.output = value >= Math.pow(2, 16) ? 1 : 0;
  }

  public onOutputChanged() {
    if (this.outputLed) {
      if (this.output) this.diagram.high(this.outputLed);
      else this.diagram.low(this.outputLed);
    }

    if (this.inputLed) {
      if (this.output) this.diagram.high(this.inputLed);
      else this.diagram.low(this.inputLed);
    }
  }
}

class Diagram {
  ledGreen = "#00FF00";
  ledGray = "#333333";

  public diagramSVG: XMLDocument;
  constructor(diagram: XMLDocument) {
    this.diagramSVG = diagram;
  }

  public get(id: string) {
    return this.diagramSVG.getElementById(id);
  }

  public high(id: string | Array<string>) {
    if (Array.isArray(id)) id.forEach((_id) => this.high(_id));
    else this.get(id)?.setAttribute("fill", this.ledGreen);
  }

  public low(id: string | Array<string>) {
    if (Array.isArray(id)) id.forEach((_id) => this.low(_id));
    else this.get(id)?.setAttribute("fill", this.ledGray);
  }

  public changeText(id: string | Array<string>, value: string) {
    if (Array.isArray(id)) {
      id.forEach((_id) => this.changeText(_id, value));
      return;
    }
    let txtObject = this.get(id);
    if (txtObject != null) {
      txtObject.innerHTML = value;
      if (txtObject.previousElementSibling?.tagName === "foreignObject") {
        let child = txtObject.previousElementSibling;
        while (child.childElementCount) child = child.children[0];
        child.innerHTML = value;
      }
    }
  }

  public dig_write(id: string | Array<string>, value: number, dig: number = 4) {
    let hexValue: string = value.toString(16).padStart(dig, "0");
    this.changeText(id, hexValue);
  }
}
