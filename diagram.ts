//let diagram: XMLDocument;

type OutputCallback = (value: number) => void;
type ID = string | null;
type IDs = Array<string> | null;

abstract class Component {
  public onOutputChange: OutputCallback | null = null;
  public diagram: Diagram;
  private _output: number = 0;
  constructor(diagram: Diagram) {
    this.diagram = diagram;
  }

  protected abstract onOutputChanged(): void;

  public get output(): number {
    return this._output;
  }

  protected set output(value) {
    if (this._output !== value) {
      this._output = value;
      this.onOutputChanged();
      this.onOutputChange?.(value);
    }
  }
}

class Multiplexer extends Component {
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
    inputCount = 8
  ) {
    super(diagram);
    this.outNUM = outNUM;
    this.selectNUM = selectNUM;
    this.inputsLEDs = inputsLEDs;
    this.inputs = Array<number>(inputCount);
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

  protected override onOutputChanged() {
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

  protected override onOutputChanged(): void {
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
    bitCount = 16
  ) {
    super(diagram);
    this.en = en;
    this.maximum = Math.pow(2, bitCount);
    this.nibbleCount = Math.ceil(bitCount / 4);
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

  protected override onOutputChanged() {
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
    bitCount = 16
  ) {
    super(diagram, valueNUM, outputNUM, true, bitCount);
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

  protected override onOutputChanged() {
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

  protected override onOutputChanged(): void {
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
    inputCount = 5
  ) {
    super(diagram);
    this.inputLEDIds = inputLEDIds;
    this.outNum = outNum;
    this.nibbleCount = Math.ceil(inputCount / 16);
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

  protected override onOutputChanged(): void {
    this.inputLEDIds?.forEach((id, i) => {
      if (this.inputs[i]) this.diagram.high(id);
      else this.diagram.low(id);
    });

    if (this.outNum)
      this.diagram.dig_write(this.outNum, this.output, this.nibbleCount);
  }
}

class Diagram {
  ledGreen = "#00FF00";
  ledGray = "#333333";

  Mem: Memory;
  AR: Register;
  PC: Register;
  DR: Register;
  ALU: ALU;
  AC: Register;
  IR: Register;
  CommonBus: Multiplexer;
  ALUEncoder: Encoder;
  SeqDec: Decoder;
  IncDec: Decoder;
  SC: Counter;

  ACZ = true;

  public diagramSVG: XMLDocument;
  constructor(diagram: XMLDocument) {
    this.diagramSVG = diagram;
    this.Mem = new Memory(this, ids.NUM_MEM_OUT, 4096, null);
    this.AR = new Register(this, ids.NUM_AC_VALUE, ids.NUM_AC_OUT, false, 12);
    this.PC = new Register(this, ids.NUM_PC_VALUE, ids.NUM_PC_OUT, false, 12);
    this.DR = new Register(this, ids.NUM_DR_VALUE, ids.NUM_DR_OUT, false, 16);
    this.ALU = new ALU(this, ids.NUM_ALU_OUT, ids.NUM_ALU_FUNC);
    this.AC = new Register(this, ids.NUM_AC_VALUE, ids.NUM_AC_OUT, false, 16);
    this.IR = new Register(this, ids.NUM_IR_VALUE, ids.NUM_IR_OUT, false, 16);
    this.CommonBus = new Multiplexer(
      this,
      [
        ids.NUM_COMMON_BUS_VALUE,
        ids.NUM_MEM_DATA,
        ids.NUM_AR_DATA,
        ids.NUM_PC_DATA,
        ids.NUM_DR_DATA,
        ids.NUM_INP_DATA,
        ids.NUM_TR_DATA,
        ids.NUM_IR_DATA,
        ids.NUM_OUTR_DATA,
      ],
      ids.NUM_COMMON_BUS_SELECT,
      ids.LED_COMBUS_MUX,
      8
    );
    this.ALUEncoder = new Encoder(this, null, ids.NUM_ALU_FUNC, 5);
    this.SeqDec = new Decoder(this, ids.LED_SEQ_DEC, [
      "T0",
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
      "T6",
      "T7",
    ]);
    this.IncDec = new Decoder(this, ids.LED_INC_DEC, [
      "load",
      "store",
      "add",
      "and",
      "jump",
      "jumpz",
      "comp",
      "lsl",
    ]);
    this.SC = new Counter(this, null, ids.NUM_SC_VALUE, 3); // for this one showing output in value box

    this.Mem.onOutputChange = (v) => this.CommonBus.setInput(0, v);

    this.Mem.onArrayChange = (v) => {
      throw new Error("not implemented"); // TODO: implement this
    };

    this.AR.onOutputChange = (v) => {
      this.Mem.addr = v;
      this.CommonBus.setInput(1, v);
    };

    this.PC.onOutputChange = (v) => this.CommonBus.setInput(2, v);
    this.DR.onOutputChange = (v) => {
      this.ALU.portB = v;
      this.CommonBus.setInput(3, v);
    };
    this.ALU.onOutputChange = (v) => (this.AC.data = v);
    this.ALUEncoder.onOutputChange = (v) => (this.ALU.func = v);
    this.AC.onOutputChange = (v) => {
      this.ALU.portA = v;
      this.CommonBus.setInput(4, v);
      this.ACZ = v === 0;
      v === 0 ? this.high(ids.LED_Z) : this.low(ids.LED_Z);
    };
    this.IR.onOutputChange = (v) => {
      this.CommonBus.setInput(7, v);
      this.IncDec.input = Math.floor(v / Math.pow(2, 12)) % Math.pow(2, 16); // extracting [15:12] bits
    };
    this.SC.onOutputChange = (v) => (this.SeqDec.input = v);
    this.IncDec.onOutputChange = (v) => {
      //TODO: implement this
    };
    this.SeqDec.onOutputChange = (v) => {
      //TODO: implement this
    };
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

  set loadM(value: boolean) {
    this.Mem.WE = value;
    this.signalLED(ids.LED_SIG_LOADM, value);
  }

  set loadAR(value: boolean) {
    this.AR.load = value;
    this.signalLED(ids.LED_SIG_LOADAR, value);
  }

  set loadPC(v: boolean) {
    this.PC.load = v;
    this.signalLED(ids.LED_SIG_LOADPC, v);
  }

  set enPC(v: boolean) {
    this.PC.en = v;
    this.signalLED(ids.LED_SIG_ENPC, v);
  }

  set loadDR(v: boolean) {
    this.DR.load = v;
    this.signalLED(ids.LED_SIG_LOADDR, v);
  }

  set loadAC(v: boolean) {
    this.AC.load = v;
    this.signalLED(ids.LED_SIG_LOADAC, v);
  }

  set loadIR(v: boolean) {
    this.IR.load = v;
    this.signalLED(ids.LED_SIG_LOADIR, v);
  }

  signalLED(LEDid: string | string[], value: boolean) {
    value ? this.high(LEDid) : this.low(LEDid);
  }
}
