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
    receivePart(part: string): Promise<boolean>
    isComplete(): boolean
    isSuccess(): boolean
    isFailure(): boolean
    resultMessage(): UR
    resultError(): string
    estimatedPercentComplete(): number
    expectedPartCount(): number
    processedPartsCount(): number
    receivedPartIndexes(): Set<number>
    fountainDecoder: {
      simpleParts: Map<number, Uint8Array>
      mixedParts: any[]
      queuedParts: any[]
    }
  }

  export class CBORDecoder {
    constructor(data: Uint8Array)
    decodeBytes(): [Uint8Array, number]
  }

  export function createPSBT(psbtBytes: Uint8Array): {
    toCbor(): Uint8Array
  }

  export function toHex(data: Uint8Array): string
}
