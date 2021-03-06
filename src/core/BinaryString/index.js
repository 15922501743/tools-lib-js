if (!Number.isInteger) {
    Number.isInteger = function isInteger (nVal) {
      return typeof nVal === "number" && isFinite(nVal) && nVal > -9007199254740992 && nVal < 9007199254740992 && Math.floor(nVal) === nVal;
    };
}
  
class BinaryString {
    constructor(vInput, sEncoding='UTF-8', nOffset /* optional */, nLength /* optional */) {
        this.encoding = sEncoding.toString();

        var fTAView, aWhole, aRaw, fPutOutptCode, fGetOutptChrSize, nInptLen, nStartIdx = isFinite(nOffset) ? nOffset : 0, nTranscrType = 15;
        encSwitch: switch (this.encoding) {
            case "UTF-8":
            fPutOutptCode = BinaryString.putUTF8CharCode;
            fGetOutptChrSize = BinaryString.getUTF8CharLength;
            fTAView = Uint8Array;
            break encSwitch;
            case "UTF-16":
            fPutOutptCode = BinaryString.putUTF16CharCode;
            fGetOutptChrSize = BinaryString.getUTF16CharLength;
            fTAView = Uint16Array;
            break encSwitch;
            case "UTF-32":
            fTAView = Uint32Array;
            nTranscrType &= 14;
            break encSwitch;
            default:
            /* case "ASCII", or case "BinaryString" or unknown cases */
            fTAView = Uint8Array;
            nTranscrType &= 14;
        }

        typeSwitch: switch (typeof vInput) {
            case "string":
            /* the input argument is a primitive string: a new buffer will be created. */
            nTranscrType &= 7;
            break typeSwitch;
            case "object":
            classSwitch: switch (vInput.constructor) {
                case BinaryString:
                /* the input argument is a BinaryString: a new buffer will be created. */
                nTranscrType &= 3;
                break typeSwitch;
                case String:
                /* the input argument is an objectified string: a new buffer will be created. */
                nTranscrType &= 7;
                break typeSwitch;
                case ArrayBuffer:
                /* the input argument is an arrayBuffer: the buffer will be shared. */
                aWhole = new fTAView(vInput);
                nInptLen = this.encoding === "UTF-32" ?
                    vInput.byteLength >>> 2
                    : this.encoding === "UTF-16" ?
                    vInput.byteLength >>> 1
                    :
                    vInput.byteLength;
                aRaw = nStartIdx === 0 && (!isFinite(nLength) || nLength === nInptLen) ?
                    aWhole
                    : new fTAView(vInput, nStartIdx, !isFinite(nLength) ? nInptLen - nStartIdx : nLength);

                break typeSwitch;
                case Uint32Array:
                case Uint16Array:
                case Uint8Array:
                /* the input argument is a typedArray: the buffer, and possibly the array itself, will be shared. */
                fTAView = vInput.constructor;
                nInptLen = vInput.length;
                aWhole = vInput.byteOffset === 0 && vInput.length === (
                    fTAView === Uint32Array ?
                    vInput.buffer.byteLength >>> 2
                    : fTAView === Uint16Array ?
                    vInput.buffer.byteLength >>> 1
                    :
                    vInput.buffer.byteLength
                ) ? vInput : new fTAView(vInput.buffer);
                aRaw = nStartIdx === 0 && (!isFinite(nLength) || nLength === nInptLen) ?
                    vInput
                    : vInput.subarray(nStartIdx, isFinite(nLength) ? nStartIdx + nLength : nInptLen);

                break typeSwitch;
                default:
                /* the input argument is an array or another serializable object: a new typedArray will be created. */
                aWhole = new fTAView(vInput);
                nInptLen = aWhole.length;
                aRaw = nStartIdx === 0 && (!isFinite(nLength) || nLength === nInptLen) ?
                    aWhole
                    : aWhole.subarray(nStartIdx, isFinite(nLength) ? nStartIdx + nLength : nInptLen);
            }
            break typeSwitch;
            default:
            /* the input argument is a number, a boolean or a function: a new typedArray will be created. */
            aWhole = aRaw = new fTAView(Number(vInput) || 0);

        }

        if (nTranscrType < 8) {

            var vSource, nOutptLen, nCharStart, nCharEnd, nEndIdx, fGetInptChrSize, fGetInptChrCode;

            if (nTranscrType & 4) { /* input is string */

            vSource = vInput;
            nOutptLen = nInptLen = vSource.length;
            nTranscrType ^= this.encoding === "UTF-32" ? 0 : 2;
            /* ...or...: nTranscrType ^= Number(this.encoding !== "UTF-32") << 1; */
            nStartIdx = nCharStart = nOffset ? Math.max((nOutptLen + nOffset) % nOutptLen, 0) : 0;
            nEndIdx = nCharEnd = (Number.isInteger(nLength) ? Math.min(Math.max(nLength, 0) + nStartIdx, nOutptLen) : nOutptLen) - 1;

            } else { /* input is BinaryString */

            vSource = vInput.rawData;
            nInptLen = vInput.makeIndex();
            nStartIdx = nCharStart = nOffset ? Math.max((nInptLen + nOffset) % nInptLen, 0) : 0;
            nOutptLen = Number.isInteger(nLength) ? Math.min(Math.max(nLength, 0), nInptLen - nCharStart) : nInptLen;
            nEndIdx = nCharEnd = nOutptLen + nCharStart;

            if (vInput.encoding === "UTF-8") {
                fGetInptChrSize = BinaryString.getUTF8CharLength;
                fGetInptChrCode = BinaryString.loadUTF8CharCode;
            } else if (vInput.encoding === "UTF-16") {
                fGetInptChrSize = BinaryString.getUTF16CharLength;
                fGetInptChrCode = BinaryString.loadUTF16CharCode;
            } else {
                nTranscrType &= 1;
            }

            }

            if (nOutptLen === 0 || nTranscrType < 4 && vSource.encoding === this.encoding && nCharStart === 0 && nOutptLen === nInptLen) {

            /* the encoding is the same, the length too and the offset is 0... or the input is empty! */

            nTranscrType = 7;

            }

            conversionSwitch: switch (nTranscrType) {

            case 0:

            /* both the source and the new BinaryString have a fixed-length encoding... */

                aWhole = new fTAView(nOutptLen);
                for (var nOutptIdx = 0; nOutptIdx < nOutptLen; aWhole[nOutptIdx] = vSource[nStartIdx + nOutptIdx++]);
                break conversionSwitch;

            case 1:

            /* the source has a fixed-length encoding but the new BinaryString has a variable-length encoding... */

                /* mapping... */

                nOutptLen = 0;

                for (var nInptIdx = nStartIdx; nInptIdx < nEndIdx; nInptIdx++) {
                nOutptLen += fGetOutptChrSize(vSource[nInptIdx]);
                }

                aWhole = new fTAView(nOutptLen);

                /* transcription of the source... */

                for (var nInptIdx = nStartIdx, nOutptIdx = 0; nOutptIdx < nOutptLen; nInptIdx++) {
                nOutptIdx = fPutOutptCode(aWhole, vSource[nInptIdx], nOutptIdx);
                }

                break conversionSwitch;

            case 2:

            /* the source has a variable-length encoding but the new BinaryString has a fixed-length encoding... */

                /* mapping... */

                nStartIdx = 0;

                var nChrCode;

                for (nChrIdx = 0; nChrIdx < nCharStart; nChrIdx++) {
                nChrCode = fGetInptChrCode(vSource, nStartIdx);
                nStartIdx += fGetInptChrSize(nChrCode);
                }

                aWhole = new fTAView(nOutptLen);

                /* transcription of the source... */

                for (var nInptIdx = nStartIdx, nOutptIdx = 0; nOutptIdx < nOutptLen; nInptIdx += fGetInptChrSize(nChrCode), nOutptIdx++) {
                nChrCode = fGetInptChrCode(vSource, nInptIdx);
                aWhole[nOutptIdx] = nChrCode;
                }

                break conversionSwitch;

            case 3:

            /* both the source and the new BinaryString have a variable-length encoding... */

                /* mapping... */

                nOutptLen = 0;

                var nChrCode;

                for (var nChrIdx = 0, nInptIdx = 0; nChrIdx < nCharEnd; nInptIdx += fGetInptChrSize(nChrCode)) {
                nChrCode = fGetInptChrCode(vSource, nInptIdx);
                if (nChrIdx === nCharStart) { nStartIdx = nInptIdx; }
                if (++nChrIdx > nCharStart) { nOutptLen += fGetOutptChrSize(nChrCode); }
                }

                aWhole = new fTAView(nOutptLen);

                /* transcription... */

                for (var nInptIdx = nStartIdx, nOutptIdx = 0; nOutptIdx < nOutptLen; nInptIdx += fGetInptChrSize(nChrCode)) {
                nChrCode = fGetInptChrCode(vSource, nInptIdx);
                nOutptIdx = fPutOutptCode(aWhole, nChrCode, nOutptIdx);
                }

                break conversionSwitch;

            case 4:

            /* DOMString to ASCII or BinaryString or other unknown encodings */

                aWhole = new fTAView(nOutptLen);

                /* transcription... */

                for (var nIdx = 0; nIdx < nOutptLen; nIdx++) {
                aWhole[nIdx] = vSource.charCodeAt(nIdx) & 0xff;
                }

                break conversionSwitch;

            case 5:

            /* DOMString to UTF-8 or to UTF-16 */

                /* mapping... */

                nOutptLen = 0;

                for (var nMapIdx = 0; nMapIdx < nInptLen; nMapIdx++) {
                if (nMapIdx === nCharStart) { nStartIdx = nOutptLen; }
                nOutptLen += fGetOutptChrSize(vSource.charCodeAt(nMapIdx));
                if (nMapIdx === nCharEnd) { nEndIdx = nOutptLen; }
                }

                aWhole = new fTAView(nOutptLen);

                /* transcription... */

                for (var nOutptIdx = 0, nChrIdx = 0; nOutptIdx < nOutptLen; nChrIdx++) {
                nOutptIdx = fPutOutptCode(aWhole, vSource.charCodeAt(nChrIdx), nOutptIdx);
                }

                break conversionSwitch;

            case 6:

            /* DOMString to UTF-32 */

                aWhole = new fTAView(nOutptLen);

                /* transcription... */

                for (var nIdx = 0; nIdx < nOutptLen; nIdx++) {
                aWhole[nIdx] = vSource.charCodeAt(nIdx);
                }

                break conversionSwitch;

            case 7:

                aWhole = new fTAView(nOutptLen ? vSource : 0);
                break conversionSwitch;

            }

            aRaw = nTranscrType > 3 && (nStartIdx > 0 || nEndIdx < aWhole.length - 1) ? aWhole.subarray(nStartIdx, nEndIdx) : aWhole;

        }

        this.buffer = aWhole.buffer;
        this.bufferView = aWhole;
        this.rawData = aRaw;
        this.valueOf = this.toString;
    }

    /**
     * UTF-8是Unicode的实现方式之一.
     * UTF-8是一种变长的编码方式. 它可以使用1~6个字节表示一个符号, 根据不同的符号而变化字节长度.
     * UTF-8的编码规则很简单, 只有两条:
     * 1) 对于单字节的符号, 字节的第一位设为0, 后面7位为这个符号的unicode码. 因此对于英语字母, UTF-8编码和ASCII码是相同的.
     * 2) 对于n字节的符号(n>1), 第一个字节的前n位都设为1, 第n+1位设为0, 后面字节的前两位一律设为10. 剩下的没有提及的二进制位, 全部为这个符号的unicode码.
     * ------------------------------------------------------
     * | Unicode符号范围   | UTF-8编码方式
     * | （十六进制）       | （二进制）
     * |-------------------|---------------------------------
     * | 0000 0000 - 0000 007F | 0xxxxxxx
     * | 0000 0000 - 0000 07FF | 110xxxxx 10xxxxxx
     * | 0000 0000 - 0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
     * | 0001 0000 - 0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
     * | 0020 0000 - 03FF FFFF | 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
     * | 0400 0000 - 7FFF FFFF | 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
     */

    static loadUTF8CharCode(aChars, nIdx) {
        /* The ISO 10646 view of UTF-8 considers valid codepoints encoded by 1-6 bytes, 
        * while the Unicode view of UTF-8 in 2003 has limited them to 1-4 bytes in order to 
        * match UTF-16's codepoints. In front of a 5/6-byte sequence BinaryString tries to 
        * encode it in any case.
        */
        var nLen = aChars.length, nPart = aChars[nIdx];
        return nPart > 251 && nPart < 254 && nIdx + 5 < nLen ?
            /* (nPart - 252 << 30) may be not safe in ECMAScript! So...: */
            /* six bytes */ (nPart - 252) * 1073741824 + (aChars[nIdx + 1] - 128 << 24) + (aChars[nIdx + 2] - 128 << 18) + (aChars[nIdx + 3] - 128 << 12) + (aChars[nIdx + 4] - 128 << 6) + aChars[nIdx + 5] - 128
        : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ?
            /* five bytes */ (nPart - 248 << 24) + (aChars[nIdx + 1] - 128 << 18) + (aChars[nIdx + 2] - 128 << 12) + (aChars[nIdx + 3] - 128 << 6) + aChars[nIdx + 4] - 128
        : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ?
            /* four bytes */(nPart - 240 << 18) + (aChars[nIdx + 1] - 128 << 12) + (aChars[nIdx + 2] - 128 << 6) + aChars[nIdx + 3] - 128
        : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ?
            /* three bytes */ (nPart - 224 << 12) + (aChars[nIdx + 1] - 128 << 6) + aChars[nIdx + 2] - 128
        : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ?
            /* two bytes */ (nPart - 192 << 6) + aChars[nIdx + 1] - 128
        :
            /* one byte */ nPart;
    }
    
    static putUTF8CharCode(aTarget, nChar, nPutAt) {
    
        var nIdx = nPutAt;
    
        if (nChar < 0x80 /* 128 */) {
        /* one byte */
        aTarget[nIdx++] = nChar;
        } else if (nChar < 0x800 /* 2048 */) {
        /* two bytes */
        aTarget[nIdx++] = 0xc0 /* 192 */ + (nChar >>> 6);
        aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        } else if (nChar < 0x10000 /* 65536 */) {
        /* three bytes */
        aTarget[nIdx++] = 0xe0 /* 224 */ + (nChar >>> 12);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        } else if (nChar < 0x200000 /* 2097152 */) {
        /* four bytes */
        aTarget[nIdx++] = 0xf0 /* 240 */ + (nChar >>> 18);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 12) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        } else if (nChar < 0x4000000 /* 67108864 */) {
        /* five bytes */
        aTarget[nIdx++] = 0xf8 /* 248 */ + (nChar >>> 24);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 18) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 12) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        } else /* if (nChar <= 0x7fffffff) */ { /* 2147483647 */
        /* six bytes */
        aTarget[nIdx++] = 0xfc /* 252 */ + /* (nChar >>> 30) may be not safe in ECMAScript! So...: */ (nChar / 1073741824);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 24) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 18) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 12) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + ((nChar >>> 6) & 0x3f /* 63 */);
        aTarget[nIdx++] = 0x80 /* 128 */ + (nChar & 0x3f /* 63 */);
        }
    
        return nIdx;
    
    }
    
    static getUTF8CharLength(nChar) {
        return nChar < 0x80 ? 1 : nChar < 0x800 ? 2 : nChar < 0x10000 ? 3 : nChar < 0x200000 ? 4 : nChar < 0x4000000 ? 5 : 6;
    }
    
    static loadUTF16CharCode(aChars, nIdx) {
    
        /* UTF-16 to DOMString decoding algorithm */
        var nFrstChr = aChars[nIdx];
    
        return nFrstChr > 0xD7BF /* 55231 */ && nIdx + 1 < aChars.length ?
        (nFrstChr - 0xD800 /* 55296 */ << 10) + aChars[nIdx + 1] + 0x2400 /* 9216 */
        : nFrstChr;
    
    }
    
    static putUTF16CharCode(aTarget, nChar, nPutAt) {
    
        var nIdx = nPutAt;
    
        if (nChar < 0x10000 /* 65536 */) {
        /* one element */
        aTarget[nIdx++] = nChar;
        } else {
        /* two elements */
        aTarget[nIdx++] = 0xD7C0 /* 55232 */ + (nChar >>> 10);
        aTarget[nIdx++] = 0xDC00 /* 56320 */ + (nChar & 0x3FF /* 1023 */);
        }
    
        return nIdx;
    
    }
    
    static getUTF16CharLength(nChar) {
        return nChar < 0x10000 ? 1 : 2;
    }
    
    /* Array of bytes to base64 string decoding */
    
    static b64ToUint6(nChr) {
    
        return nChr > 64 && nChr < 91 ?
            nChr - 65
        : nChr > 96 && nChr < 123 ?
            nChr - 71
        : nChr > 47 && nChr < 58 ?
            nChr + 4
        : nChr === 43 ?
            62
        : nChr === 47 ?
            63
        :
            0;
    
    }
    
    static uint6ToB64(nUint6) {
    
        return nUint6 < 26 ?
            nUint6 + 65
        : nUint6 < 52 ?
            nUint6 + 71
        : nUint6 < 62 ?
            nUint6 - 4
        : nUint6 === 62 ?
            43
        : nUint6 === 63 ?
            47
        :
            65;
    
    }
    
    /* Base64 string to array encoding */
    
    static bytesToBase64(aBytes) {
    
        var eqLen = (3 - (aBytes.length % 3)) % 3, sB64Enc = "";
    
        for (var nMod3, nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
        nMod3 = nIdx % 3;
        /* Uncomment the following line in order to split the output in lines 76-character long: */
        /*
        if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
        */
        nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
        if (nMod3 === 2 || aBytes.length - nIdx === 1) {
            sB64Enc += String.fromCharCode(BinaryString.uint6ToB64(nUint24 >>> 18 & 63), BinaryString.uint6ToB64(nUint24 >>> 12 & 63), BinaryString.uint6ToB64(nUint24 >>> 6 & 63), BinaryString.uint6ToB64(nUint24 & 63));
            nUint24 = 0;
        }
        }
    
        return  eqLen === 0 ?
            sB64Enc
        :
            sB64Enc.substring(0, sB64Enc.length - eqLen) + (eqLen === 1 ? "=" : "==");
    
    
    }
    
    
    static base64ToBytes(sBase64, nBlockBytes) {
    
        var
        sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""), nInLen = sB64Enc.length,
        nOutLen = nBlockBytes ? Math.ceil((nInLen * 3 + 1 >>> 2) / nBlockBytes) * nBlockBytes : nInLen * 3 + 1 >>> 2, aBytes = new Uint8Array(nOutLen);
    
        for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
        nMod4 = nInIdx & 3;
        nUint24 |= BinaryString.b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
        if (nMod4 === 3 || nInLen - nInIdx === 1) {
            for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
            aBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
            }
            nUint24 = 0;
        }
        }
    
        return aBytes;
    
    }
    
    static makeFromBase64(sB64Inpt, sEncoding, nByteOffset, nLength) {
    
        return new BinaryString(sEncoding === "UTF-16" || sEncoding === "UTF-32" ? BinaryString.base64ToBytes(sB64Inpt, sEncoding === "UTF-16" ? 2 : 4).buffer : BinaryString.base64ToBytes(sB64Inpt), sEncoding, nByteOffset, nLength);
    
    }


    makeIndex(nChrLength, nStartFrom) {
        var aTarget = this.rawData, nChrEnd, nRawLength = aTarget.length,
            nStartIdx = nStartFrom || 0, nIdxEnd = nStartIdx, nStopAtChr = isNaN(nChrLength) ? Infinity : nChrLength;

        if (nChrLength + 1 > aTarget.length) { throw new RangeError("BinaryString.prototype.makeIndex - The offset can\'t be major than the length of the array - 1."); }

        switch (this.encoding) {

            case "UTF-8":

            var nPart;

            for (nChrEnd = 0; nIdxEnd < nRawLength && nChrEnd < nStopAtChr; nChrEnd++) {
                nPart = aTarget[nIdxEnd];
                nIdxEnd += nPart > 251 && nPart < 254 && nIdxEnd + 5 < nRawLength ? 6
                : nPart > 247 && nPart < 252 && nIdxEnd + 4 < nRawLength ? 5
                : nPart > 239 && nPart < 248 && nIdxEnd + 3 < nRawLength ? 4
                : nPart > 223 && nPart < 240 && nIdxEnd + 2 < nRawLength ? 3
                : nPart > 191 && nPart < 224 && nIdxEnd + 1 < nRawLength ? 2
                : 1;
            }

            break;

            case "UTF-16":

            for (nChrEnd = nStartIdx; nIdxEnd < nRawLength && nChrEnd < nStopAtChr; nChrEnd++) {
                nIdxEnd += aTarget[nIdxEnd] > 0xD7BF /* 55231 */ && nIdxEnd + 1 < aTarget.length ? 2 : 1;
            }

            break;

            default:

            nIdxEnd = nChrEnd = isFinite(nChrLength) ? nChrLength : nRawLength - 1;

        }

        if (nChrLength) { return nIdxEnd; }

        return nChrEnd;
    }

    toBase64(bWholeBuffer) {

        return BinaryString.bytesToBase64(
            bWholeBuffer ?
            (
                this.bufferView.constructor === Uint8Array ?
                this.bufferView
                :
                new Uint8Array(this.buffer)
            )
            : this.rawData.constructor === Uint8Array ?
            this.rawData
            :
            new Uint8Array(this.buffer, this.rawData.byteOffset, this.rawData.length << (this.rawData.constructor === Uint16Array ? 1 : 2))
            );

    }

    subview(nCharOffset /* optional */, nCharLength /* optional */) {
        var nRawSubLen, nRawSubOffset, nSubOffset, nSubLen, bVariableLen = this.encoding === "UTF-8" || this.encoding === "UTF-16",
            nThisLen, nRawLen = this.rawData.length;

        if (nRawLen === 0) {
            return new BinaryString(this.buffer, this.encoding);
        }

        nThisLen = bVariableLen ? this.makeIndex() : nRawLen;
        nSubOffset = nCharOffset ? nCharOffset + 1 > nThisLen ? nThisLen : Math.max((nThisLen + nCharOffset) % nThisLen, 0) : 0;
        nSubLen = Number.isInteger(nCharLength) ? Math.max(nCharLength, 0) + nSubOffset > nThisLen ? nThisLen - nSubOffset : nCharLength : nThisLen - nSubOffset;

        if (nSubOffset === 0 && nSubLen === nThisLen) { return this; }

        if (bVariableLen) {
            nRawSubOffset = nSubOffset < nThisLen ? this.makeIndex(nSubOffset) : nThisLen;
            nRawSubLen = nSubLen ? this.makeIndex(nSubLen, nRawSubOffset) - nRawSubOffset : 0;
        } else {
            nRawSubOffset = nSubOffset;
            nRawSubLen = nSubLen;
        }

        if (this.encoding === "UTF-16") {
            nRawSubOffset <<= 1;
        } else if (this.encoding === "UTF-32") {
            nRawSubOffset <<= 2;
        }

        return new BinaryString(this.buffer, this.encoding, this.rawData.byteOffset + nRawSubOffset, nRawSubLen);
    }

    forEachChar(fCallback, oThat, nChrOffset, nChrLen) {
        var aSource = this.rawData, nRawEnd, nRawIdx;

        if (this.encoding === "UTF-8" || this.encoding === "UTF-16") {

            var fGetInptChrSize, fGetInptChrCode;

            if (this.encoding === "UTF-8") {
            fGetInptChrSize = BinaryString.getUTF8CharLength;
            fGetInptChrCode = BinaryString.loadUTF8CharCode;
            } else if (this.encoding === "UTF-16") {
            fGetInptChrSize = BinaryString.getUTF16CharLength;
            fGetInptChrCode = BinaryString.loadUTF16CharCode;
            }

            nRawIdx = isFinite(nChrOffset) ? this.makeIndex(nChrOffset) : 0;
            nRawEnd = isFinite(nChrLen) ? this.makeIndex(nChrLen, nRawIdx) : aSource.length;

            for (var nChrCode, nChrIdx = 0; nRawIdx < nRawEnd; nChrIdx++) {
            nChrCode = fGetInptChrCode(aSource, nRawIdx);
            if (!oThat) {
                fCallback(nChrCode, nChrIdx, nRawIdx, aSource);
            } else {
                fCallback.call(oThat, nChrCode, nChrIdx, nRawIdx, aSource);
            }
            nRawIdx += fGetInptChrSize(nChrCode);
            }

        } else {

            nRawIdx = isFinite(nChrOffset) ? nChrOffset : 0;
            nRawEnd = isFinite(nChrLen) ? nChrLen + nRawIdx : aSource.length;

            for (nRawIdx; nRawIdx < nRawEnd; nRawIdx++) {
            if (!oThat) {
                fCallback(aSource[nRawIdx], nRawIdx, nRawIdx, aSource);
            } else {
                fCallback.call(oThat, aSource[nRawIdx], nRawIdx, nRawIdx, aSource);
            }
            }

        }
    }

    toString() {
        if (this.encoding !== "UTF-8" && this.encoding !== "UTF-16") {
            /* ASCII, UTF-32 or BinaryString to DOMString */
            return String.fromCharCode.apply(null, this.rawData);
        }

        var fGetCode, fGetIncr, sView = "";

        if (this.encoding === "UTF-8") {
            fGetIncr = BinaryString.getUTF8CharLength;
            fGetCode = BinaryString.loadUTF8CharCode;
        } else if (this.encoding === "UTF-16") {
            fGetIncr = BinaryString.getUTF16CharLength;
            fGetCode = BinaryString.loadUTF16CharCode;
        }

        for (var nChr, nLen = this.rawData.length, nIdx = 0; nIdx < nLen; nIdx += fGetIncr(nChr)) {
            nChr = fGetCode(this.rawData, nIdx);
            sView += String.fromCharCode(nChr);
        }

        return sView;
    }
}

export default BinaryString;

let init = function(...args) {
    return new BinaryString(...args);
}

export const binaryStringWrapper = Object.assign(init, {
    loadUTF8CharCode: BinaryString.loadUTF8CharCode,
    putUTF8CharCode: BinaryString.putUTF8CharCode,
    getUTF8CharLength: BinaryString.getUTF8CharLength,
    loadUTF16CharCode: BinaryString.loadUTF16CharCode,
    putUTF16CharCode: BinaryString.putUTF16CharCode,
    getUTF16CharLength: BinaryString.getUTF16CharLength,
    b64ToUint6: BinaryString.b64ToUint6,
    uint6ToB64: BinaryString.uint6ToB64,
    bytesToBase64: BinaryString.bytesToBase64,
    base64ToBytes: BinaryString.base64ToBytes,
    makeFromBase64: BinaryString.makeFromBase64,
})
