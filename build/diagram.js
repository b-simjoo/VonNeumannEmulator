"use strict";
//let diagram: XMLDocument;
function HEX(value, pad = 4) {
    return (value || 0).toString(16).padStart(pad, "0");
}
class Component {
    constructor(diagram) {
        this.onOutputChange = null;
        this._output = 0;
        this.diagram = diagram;
    }
    get output() {
        return this._output;
    }
    set output(value) {
        var _a;
        if (this._output !== value) {
            this._output = value;
            this.onOutputChanged();
            (_a = this.onOutputChange) === null || _a === void 0 ? void 0 : _a.call(this, value);
        }
    }
}
class Multiplexer extends Component {
    constructor(diagram, outNUM, selectNUM, inputsLEDs, inputCount = 8) {
        super(diagram);
        this._select = 0;
        this.outNUM = outNUM;
        this.selectNUM = selectNUM;
        this.inputsLEDs = inputsLEDs;
        this.inputs = Array(inputCount);
        this.update();
        this.onOutputChanged();
    }
    set select(value) {
        var _a;
        this._select = value;
        if (this.selectNUM)
            this.diagram.dig_write(this.selectNUM, this._select, 1);
        (_a = this.inputsLEDs) === null || _a === void 0 ? void 0 : _a.forEach((LEDid, index) => {
            if (this.select == index)
                this.diagram.high(LEDid);
            else
                this.diagram.low(LEDid);
        });
        this.output = this.inputs[value] || 0;
    }
    get select() {
        return this._select;
    }
    setInput(index, value) {
        this.inputs[index] = value;
    }
    update() {
        this.output = this.inputs[this._select] || 0;
    }
    onOutputChanged() {
        if (this.outNUM)
            this.diagram.dig_write(this.outNUM, this.output, 4);
    }
}
class Memory extends Component {
    constructor(diagram, outputNUM, memSize = 4096) {
        super(diagram);
        this.WE = false;
        this.data = 0;
        this.onArrayChange = null;
        this._addr = 0;
        this.outputNUM = outputNUM;
        this._memArray = Array(memSize);
        this.onOutputChanged();
    }
    get memArray() {
        return this._memArray;
    }
    set memArray(value) {
        this._memArray = value;
        this.output = this._memArray[this._addr] || 0;
    }
    set addr(value) {
        this._addr = value;
        this.output = this.memArray[value] || 0;
    }
    tick() {
        var _a;
        this.output = this.memArray[this._addr] || 0; //update output on uprise clock
        if (this.WE) {
            console.log("writing to memory,  address: " + this._addr + " data: " + this.data);
            this.memArray[this._addr] = this.data;
            (_a = this.onArrayChange) === null || _a === void 0 ? void 0 : _a.call(this, this, this._addr || 0, this.data || 0);
        }
    }
    onOutputChanged() {
        if (this.outputNUM) {
            this.diagram.dig_write(this.outputNUM, this.output, 4);
        }
    }
}
class Register extends Component {
    constructor(diagram, name, valueNUM, outputNUM, en = false, bitCount = 16) {
        super(diagram);
        this.load = false;
        this.rst = false;
        this.data = 0;
        this.value = 0;
        this.name = name;
        this.en = en;
        this.maximum = Math.pow(2, bitCount);
        this.nibbleCount = Math.ceil(bitCount / 4);
        this.valueNUM = valueNUM;
        this.outputNUM = outputNUM;
        this.onOutputChanged();
    }
    tick() {
        let tmp = this.value;
        if (this.load) {
            this.value = this.data;
        }
        if (this.en)
            this.value = (this.value + 1) % this.maximum;
        if (this.rst) {
            this.value = 0;
        }
        console.log(this.name +
            " Value:" +
            HEX(this.value) +
            ", Data:" +
            HEX(this.data) +
            " " +
            HEX(tmp) +
            "=>" +
            HEX(this.value) +
            "  [load:" +
            (this.load ? 1 : 0) +
            ", en:" +
            (this.en ? 1 : 0) +
            ", rst:" +
            (this.rst ? 1 : 0) +
            "]");
        this.output = this.value;
    }
    onOutputChanged() {
        if (this.valueNUM)
            this.diagram.dig_write(this.valueNUM, this.value, this.nibbleCount);
        if (this.outputNUM)
            this.diagram.dig_write(this.outputNUM, this.output, this.nibbleCount);
    }
}
class Counter extends Register {
    constructor(diagram, name, valueNUM, outputNUM, bitCount = 16) {
        super(diagram, name, valueNUM, outputNUM, true, bitCount);
    }
}
class ALU extends Component {
    constructor(diagram, outNUM, funcName) {
        super(diagram);
        this._portA = 0;
        this._portB = 0;
        this._func = 0;
        this.functions = [
            (a, b) => a + b,
            (a, b) => a & b,
            (a, b) => ~a,
            (a, b) => a << 1,
            (a, b) => b,
        ];
        this.functionNames = ["ADD", "AND", "NOT", "LSL", "---"];
        this.outNUM = outNUM;
        this.funcName = funcName;
        this.onOutputChanged();
    }
    set portA(value) {
        this._portA = value;
        this.output = this.functions[this._func](this._portA, this._portB);
    }
    set portB(value) {
        this._portB = value;
        this.output = this.functions[this._func](this._portA, this._portB);
    }
    set func(value) {
        this._func = value;
        if (this.funcName)
            this.diagram.changeText(this.funcName, "func: " + this.functionNames[this._func]);
        this.output = this.functions[this._func](this._portA, this._portB);
    }
    onOutputChanged() {
        if (this.outNUM)
            this.diagram.dig_write(this.outNUM, this.output, 4);
    }
}
class Decoder extends Component {
    constructor(diagram, outputLEDs, outputLabels) {
        super(diagram);
        this.outputLEDs = outputLEDs;
        if (outputLEDs)
            this.diagram.high(outputLEDs[0]);
        outputLabels.forEach((label, index) => Object.defineProperty(this, label, {
            get() {
                return this.output === index;
            },
        }));
        this.onOutputChanged();
    }
    set input(value) {
        this.output = value;
    }
    onOutputChanged() {
        var _a;
        (_a = this.outputLEDs) === null || _a === void 0 ? void 0 : _a.forEach((LEDId, index) => {
            if (this.output == index)
                this.diagram.high(LEDId);
            else
                this.diagram.low(LEDId);
        });
    }
}
class Encoder extends Component {
    constructor(diagram, inputLEDIds, outNum, inputCount = 5) {
        super(diagram);
        this.inputLEDIds = inputLEDIds;
        this.outNum = outNum;
        this.nibbleCount = Math.ceil(inputCount / 16);
        this.inputs = Array(inputCount);
        this.onOutputChanged();
    }
    setInput(key, value) {
        this.inputs[key] = value;
        //priority encoder:
        for (let i = 0; i < this.inputs.length; i++) {
            if (this.inputs[i]) {
                this.output = i;
                return;
            }
        }
        this.output = 0;
    }
    onOutputChanged() {
        var _a;
        (_a = this.inputLEDIds) === null || _a === void 0 ? void 0 : _a.forEach((id, i) => {
            if (this.inputs[i])
                this.diagram.high(id);
            else
                this.diagram.low(id);
        });
        if (this.outNum)
            this.diagram.dig_write(this.outNum, this.output, this.nibbleCount);
    }
}
class Diagram {
    constructor(diagram) {
        this.ledGreen = "#00FF00";
        this.ledGray = "#E6E6E6";
        this.CLKup = false;
        this.ACZ = true;
        this.diagramSVG = diagram;
        this.Mem = new Memory(this, ids.NUM_MEM_OUT, 4096);
        this.AR = new Register(this, "AR", ids.NUM_AC_VALUE, ids.NUM_AC_OUT, false, 12);
        this.PC = new Register(this, "PC", ids.NUM_PC_VALUE, ids.NUM_PC_OUT, false, 12);
        this.DR = new Register(this, "DR", ids.NUM_DR_VALUE, ids.NUM_DR_OUT, false, 16);
        this.ALU = new ALU(this, ids.NUM_ALU_OUT, ids.TXT_ALU_FUNC);
        this.AC = new Register(this, "AC", ids.NUM_AC_VALUE, ids.NUM_AC_OUT, false, 16);
        this.IR = new Register(this, "IR", ids.NUM_IR_VALUE, null, false, 16);
        this.CommonBus = new Multiplexer(this, [
            ids.NUM_COMMON_BUS_VALUE,
            ids.NUM_MEM_DATA,
            ids.NUM_AR_DATA,
            ids.NUM_PC_DATA,
            ids.NUM_DR_DATA,
            ids.NUM_TR_DATA,
            ids.NUM_IR_DATA,
            ids.NUM_OUTR_DATA,
        ], ids.NUM_COMMON_BUS_SELECT, ids.LED_COMBUS_MUX, 8);
        this.ALUEncoder = new Encoder(this, null, ids.NUM_ALU_FUNCNUM, 5);
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
        this.SC = new Counter(this, "SC", null, ids.NUM_SC_VALUE, 3); // for this one showing output in value box
        this.Mem.onOutputChange = (v) => {
            console.log("mem output changed=>" + v);
            this.CommonBus.setInput(0, v);
        };
        this.Mem.onArrayChange = (v) => {
            // TODO: implement this
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
            this.ACZ = this.signalLED(ids.LED_Z, v === 0);
        };
        this.IR.onOutputChange = (v) => {
            this.CommonBus.setInput(7, v);
            let inc = Math.floor(v / Math.pow(2, 12)) % Math.pow(2, 16);
            this.IncDec.input = inc; // extracting [15:12] bits
            this.dig_write(ids.NUM_IR_OUT, inc, 1);
        };
        this.SC.onOutputChange = (v) => (this.SeqDec.input = v);
        this.IncDec.onOutputChange = (v) => {
            //TODO: implement this
        };
        this.SeqDec.onOutputChange = (v) => {
            //TODO: implement this
        };
        this.CommonBus.onOutputChange = (v) => {
            console.log("commonBus output changed =>" + v);
            [this.Mem, this.DR, this.IR].forEach((comp) => {
                comp.data = v;
            });
            this.AR.data = v % Math.pow(2, 12);
            this.PC.data = v % Math.pow(2, 12);
        };
        this.signalLED(ids.LED_CLK, this.CLKup);
    }
    tick() {
        if (this.CLKup) {
            this.tickRegisters();
        }
        else {
            this.CommonBus.select =
                this.SeqDec.T1 ||
                    (this.SeqDec.T3 && this.IncDec.load) ||
                    (this.IncDec.Add && this.SeqDec.T2) ||
                    (this.IncDec.And && this.SeqDec.T3)
                    ? 0 // select mem
                    : this.SeqDec.T0
                        ? 2 // select PC
                        : this.IncDec.store && this.SeqDec.T3
                            ? 4 // select AC
                            : this.SeqDec.T2 &&
                                (this.IncDec.load ||
                                    this.IncDec.store ||
                                    this.IncDec.add ||
                                    this.IncDec.jump ||
                                    (this.IncDec.jumpz && this.ACZ))
                                ? 7 // select IR
                                : 0; // Default
            this.CommonBus.update();
            console.log("common bus select: " + this.CommonBus.select);
            this.enPC = this.SeqDec.T0;
            this.loadAC =
                (this.IncDec.load && this.SeqDec.T4) ||
                    (this.IncDec.add && this.SeqDec.T4) ||
                    (this.IncDec.and && this.SeqDec.T4) ||
                    (this.IncDec.comp && this.SeqDec.T2) ||
                    (this.IncDec.lsl && this.SeqDec.T2);
            this.loadM = this.IncDec.store && this.SeqDec.T3;
            this.loadAR =
                (this.IncDec.load && this.SeqDec.T2) ||
                    (this.IncDec.store && this.SeqDec.T2) ||
                    (this.IncDec.add && this.SeqDec.T2) ||
                    (this.IncDec.and && this.SeqDec.T3) ||
                    this.SeqDec.T0;
            this.loadPC =
                this.SeqDec.T2 && (this.IncDec.jump || (this.IncDec.jumpz && this.ACZ));
            this.loadDR =
                this.SeqDec.T3 &&
                    (this.IncDec.load || this.IncDec.add || this.IncDec.And);
            this.loadIR = this.SeqDec.T1;
            this.rstSC =
                (this.IncDec.load && this.SeqDec.T4) ||
                    (this.IncDec.store && this.SeqDec.T3) ||
                    (this.IncDec.add && this.SeqDec.T4) ||
                    (this.IncDec.and && this.SeqDec.T4) ||
                    (this.IncDec.comp && this.SeqDec.T2) ||
                    (this.IncDec.lsl && this.SeqDec.T2) ||
                    (this.IncDec.jump && this.SeqDec.T2) ||
                    (this.IncDec.jumpz && this.SeqDec.T2);
            this.ALUEncoder.setInput(0, this.signalLED(ids.LED_SIG_ADD_T4, this.IncDec.add && this.SeqDec.T4));
            this.ALUEncoder.setInput(1, this.signalLED(ids.LED_SIG_AND_T4, this.IncDec.and && this.SeqDec.T4));
            this.ALUEncoder.setInput(2, this.signalLED(ids.LED_SIG_COMP_T2, this.IncDec.comp && this.SeqDec.T2));
            this.ALUEncoder.setInput(3, this.signalLED(ids.LED_SIG_LSL_T2, this.IncDec.lsl && this.SeqDec.T2));
            this.ALUEncoder.setInput(4, this.signalLED(ids.LED_SIG_LOAD_T4, this.IncDec.load && this.SeqDec.T4));
        }
        this.signalLED(ids.LED_CLK, this.CLKup);
        this.CLKup = !this.CLKup;
    }
    tickRegisters() {
        let clks = [
            this.Mem,
            this.AR,
            this.PC,
            this.DR,
            this.AC,
            this.IR,
            this.SC,
        ];
        clks.forEach((comp) => {
            comp.tick();
        });
    }
    get(id) {
        return this.diagramSVG.getElementById(id);
    }
    high(id) {
        var _a;
        if (Array.isArray(id))
            id.forEach((_id) => this.high(_id));
        else
            (_a = this.get(id)) === null || _a === void 0 ? void 0 : _a.setAttribute("fill", this.ledGreen);
    }
    low(id) {
        var _a;
        if (Array.isArray(id))
            id.forEach((_id) => this.low(_id));
        else
            (_a = this.get(id)) === null || _a === void 0 ? void 0 : _a.setAttribute("fill", this.ledGray);
    }
    changeText(id, value) {
        var _a;
        if (Array.isArray(id)) {
            id.forEach((_id) => this.changeText(_id, value));
            return;
        }
        let txtObject = this.get(id);
        if (txtObject != null) {
            txtObject.innerHTML = value;
            if (((_a = txtObject.previousElementSibling) === null || _a === void 0 ? void 0 : _a.tagName) === "foreignObject") {
                let child = txtObject.previousElementSibling;
                while (child.childElementCount)
                    child = child.children[0];
                child.innerHTML = value;
            }
        }
    }
    loadMemArray(array) {
        this.Mem.memArray = array;
    }
    dig_write(id, value, dig = 4) {
        let hexValue = HEX(value, dig);
        this.changeText(id, hexValue);
    }
    set loadM(value) {
        this.Mem.WE = value;
        this.signalLED(ids.LED_SIG_LOADM, value);
        console.log("loadM: " + value);
    }
    set loadAR(value) {
        this.AR.load = value;
        this.signalLED(ids.LED_SIG_LOADAR, value);
        console.log("loadAR: " + value);
    }
    set loadPC(v) {
        this.PC.load = v;
        this.signalLED(ids.LED_SIG_LOADPC, v);
        console.log("loadPC: " + v);
    }
    set enPC(v) {
        this.PC.en = v;
        this.signalLED(ids.LED_SIG_ENPC, v);
        console.log("enPC: " + v);
    }
    set loadDR(v) {
        this.DR.load = v;
        this.signalLED(ids.LED_SIG_LOADDR, v);
        console.log("loadDR: " + v);
    }
    set loadAC(v) {
        this.AC.load = v;
        this.signalLED(ids.LED_SIG_LOADAC, v);
        console.log("loadAC: " + v);
    }
    set loadIR(v) {
        this.IR.load = v;
        this.signalLED(ids.LED_SIG_LOADIR, v);
        console.log("loadIR: " + v);
    }
    set rstSC(v) {
        this.SC.rst = v;
        this.signalLED(ids.LED_SIG_RSTSC, v);
        console.log("rstSC: " + v);
    }
    signalLED(LEDid, value) {
        value ? this.high(LEDid) : this.low(LEDid);
        return value;
    }
}
