declare module 'foundation-ur-py' {
  export class UR {
    constructor(type: string, cbor: Uint8Array)
    cbor: Uint8Array
    type: string
  }

  export class UREncoder {
    constructor(ur: UR, maxFragmentLength: number, firstSeqNum?: number, minFragmentLength?: number)
    fountainEncoder: {
      seqLen(): number
    }
    nextPart(): Promise<string>
    isComplete(): boolean
  }

  export class URDecoder {
    constructor()
    receivePart(part: string): Promise<void>
    isComplete(): boolean
    isSuccess(): boolean
    resultMessage(): UR
    resultError(): string
  }

  export function createPSBT(psbtBytes: Uint8Array): {
    toCbor(): Uint8Array
  }

  export function toHex(data: Uint8Array): string
}
