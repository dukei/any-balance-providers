var CRB_M = {
    len_n_fmt: function(name, len, a_f) { return name + " должен быть длиной " + len + " символов и состоять из цифр от 0 до 9" + (a_f ? " и букв A, B, C, D, F" : ""); },
    crypt_err: function(msg) { return "Ошибка шифрования: " + msg; },
    invalid: function(name) { return name + " задан неверно"; },

    SESSION: "Номер сессии",
    PASS: "Пароль",
    PASS2: "Введенный пароль не соответствует требованиям к сложности пароля.\r\nЗапрещены Постоянные пароли содержащие:\r\n- 4 и более совпадающих цифр подряд;\r\n- первые 4-е цифры совпадают со следующими 4-мя цифрами;\r\n- первые 4-е цифры совпадают с обратной перестановкой следующих 4-х цифр.\r\nТакже запрещены Постоянные пароли содержащие подстроки \r\nпоследовательностей 0123456789, 9876543210, 1234567890, 0987654321 \r\nи подстроки номера Идентификационной карты клиента.",
    PASS_COMPARE: "Введенные пароли не совпадают.",
    INVALID_PIN2: "Набор введенных символов не может быть ПИН2-кодом",
    PIN2: "ПИН2",
    ENC_PIN2: "Зашифрованный ПИН2",
    INKEY: "АСП",
    NUMKEY: "Номер АСП",
    NUMCLIENT: "Идентификационная карта"
};

var CRB = {

    encryptBlock: function(pin2, transCode) {
        if (!this.data.checkMatches(transCode, 16))
            return { error: this.msg.len_n_fmt(this.msg.SESSION, 16, false) };

        if (!this.data.checkMatches(pin2, 16, true))
            return { error: this.msg.len_n_fmt(this.msg.PIN2, 16, true) };

        //if (!this.data.checkOdd(pin2))
        //    return { error: this.msg.INVALID_PIN2 };

        try {
            var out = this.data.pair(CryptoJS.DES.encrypt(CryptoJS.enc.Hex.parse(transCode), CryptoJS.enc.Hex.parse(pin2), { mode: CryptoJS.mode.ECB }).ciphertext);
            return { result: out.start.toString().toUpperCase() };
        } catch (e) {
            return { error: this.msg.crypt_err(e.message) };
        }
    },

    encryptBlock2: function(opin2, transCode) {
        var pin2 = opin2.val();
        if (!this.data.checkMatches(transCode, 16)) {
            opin2.val('');
            return { error: this.msg.len_n_fmt(this.msg.SESSION, 16, false) };
        }
        if (!this.data.checkMatches(pin2, 16, true)) {
            opin2.val('');
            return { error: this.msg.len_n_fmt(this.msg.PIN2, 16, true) };
        }
        if (!this.data.checkOdd(pin2)) {
            opin2.val('');
            return { error: this.msg.INVALID_PIN2 };
        }
        try {
            var out = this.data.pair(CryptoJS.DES.encrypt(CryptoJS.enc.Hex.parse(transCode), CryptoJS.enc.Hex.parse(pin2), { mode: CryptoJS.mode.ECB }).ciphertext);
            return { result: out.start.toString().toUpperCase() };
        } catch (e) {
            opin2.val('');
            return { error: this.msg.crypt_err(e.message) };
        }
    },

    encryptPin2n: function(opin1, opin2, opwd1, opwd2) {
        var pin1 = opin1.val();
        var pin2 = opin2.val();
        var pwd1 = opwd1.val();
        var pwd2 = opwd2.val();
        var err = "";
        var res = "";
        if (!this.data.checkMatches(pin2, 16, true)) {
            opin2.val('');
            err += this.msg.len_n_fmt(this.msg.PIN2, 16, true);
        }
        if (!this.data.checkOdd(pin2)) {
            opin2.val('');
            err += this._eol + this.msg.INVALID_PIN2;
        }
        if (!this.data.checkMatches(pwd1, 8)) {
            opwd1.val('');
            opwd2.val('');
            err += this._eol + this.msg.len_n_fmt(this.msg.PASS, 8, false);
        }
        if (!(pwd1 === pwd2)) {
            opwd1.val('');
            opwd2.val('');
            err += this._eol + this.msg.PASS_COMPARE;
        }
        else if (!this.data.CheckPwdBusinessRules(pwd1, pin1)) {
            opwd1.val('');
            opwd2.val('');
            err += this._eol + this.msg.PASS2;
        }
        if (!err) {
            try {
                var out = this.data.doCrypt("encrypt", function(o) { return o; }, pin2, pwd1);
                res = (out.start.toString() + out.end.toString()).toUpperCase();
            } catch (e) {
                opin2.val('');
                opwd1.val('');
                opwd2.val('');
                err += this._eol + this.msg.crypt_err(e.message);
            }
        }
        return { error: err, result: res };

    },

    encryptPin2: function(pin2, pass) {
        if (!this.data.checkMatches(pin2, 16, true))
            return { error: this.msg.len_n_fmt(this.msg.PIN2, 16, true) };

        if (!this.data.checkOdd(pin2))
            return { error: this.msg.invalid(this.msg.PIN2) };

        if (!this.data.checkMatches(pass, 8))
            return { error: this.msg.len_n_fmt(this.msg.PASS, 8, false) };

        try {
            var out = this.data.doCrypt("encrypt", function(o) { return o; }, pin2, pass);
            return { result: (out.start.toString() + out.end.toString()).toUpperCase() };
        } catch (e) {
            return { error: this.msg.crypt_err(e.message) };
        }
    },

    decryptPin2: function(encPin2, pass) {
        if (!this.data.checkMatches(encPin2, 32, true))
            return { error: this.msg.len_n_fmt(this.msg.ENC_PIN2, 32, true) };

        if (!this.data.checkMatches(pass, 8))
            return { error: this.msg.len_n_fmt(this.msg.PASS, 8, false) };

        try {
            var out = this.data.doCrypt("decrypt", function(o) { return { ciphertext: o }; }, encPin2, pass);
            return { result: out.start.toString().toUpperCase() };
        } catch (e) {
            return { error: this.msg.crypt_err(e.message) };
        }
    },

    sign: function(message, inKey, numKey, numClient) {
        //if (!this.data.checkMatches(numKey.trim(), "1,7", false))
        //    return { error: this.msg.invalid(this.msg.NUMKEY) };

        if (numKey.length != 7) numKey = this.data.fillStart(numKey.trim(), 7, '0');

        if (!this.data.checkMatches(numClient.trim(), "1,19", false))
            return { error: this.msg.invalid(this.msg.NUMCLIENT) };

        numClient = this.data.fillEnd(numClient, 19, ' ');

        if (!this.data.checkMatches(inKey.trim(), 16, true))
            return { error: this.msg.invalid(this.msg.INKEY) };

        var sizeMessage = this.data.fillStart(String(message).length, 4, '0');

        try {
            var cpMessage = this.data.codePage.winToDos(message);
            var digest = CryptoJS.SHA1(CryptoJS.enc.Hex.parse(this.data.arrToHex(this.data.codePage.dosToAs(numKey + inKey.toUpperCase() + sizeMessage).concat(this.data.codePage.dosbToAs(cpMessage))))).toString();
            return { result: (numClient + numKey + digest + sizeMessage + this.data.arrToHex(cpMessage)).toUpperCase(), digest: digest.toUpperCase() };
        } catch (e) {
            return { error: this.msg.crypt_err(e.message) };
        }
    },


    data: {
        salt: function() { return 'CCC8D1EEF0EAE8ED'; },

        checkMatches: function(str, len, a_f) {
            return str && str.match(new RegExp("^[0-9" + (a_f ? "a-f" : "") + "]{" + len + "}$", "i"));
        },

        fillStart: function(str, maxLen, s) {
            return new Array(1 + (maxLen - String(str).length)).join(s) + str;
        },

        fillEnd: function(str, maxLen, s) {
            return str + (new Array(1 + (maxLen - String(str).length)).join(s));
        },

        checkOdd: function(hex) {
            for (var i = 0; i < hex.length; i += 2) {
                var iBt = parseInt('0x' + hex.substr(i, 2));
                if (iBt < 0) iBt = 256 + iBt;
                var iOdd = 0;
                while (iBt > 0) {
                    iOdd ^= iBt % 2;
                    iBt = Math.floor(iBt / 2);
                }
                if (iOdd == 0) return false;
            }
            return true;
        },

        arrToHex: function(array) {
            var result = "";
            for (var i = 0; i < array.length; i++) {
                var res0 = Number(array[i]).toString(16);
                result += res0.length == 1 ? '0' + res0 : res0;
            }
            return result;
        },

        pair: function(obj) {
            return { start: CryptoJS.lib.WordArray.create([obj.words[0], obj.words[1]]),
                end: obj.words.length == 4 ? CryptoJS.lib.WordArray.create([obj.words[2], obj.words[3]]) : null
            };
        },

        genMD5: function(hex, n) {
            hex = CryptoJS.enc.Hex.parse(hex);
            for (var i = 0; i < n; i++)
                hex = CryptoJS.MD5(hex);
            return hex;
        },

        pass2hex: function(str) { return CryptoJS.enc.Latin1.parse(CryptoJS.enc.Latin1.parse(str).toString().toUpperCase()) },

        doCrypt: function(method, cb, hex, pass) {
            var g = this.pair(this.genMD5(this.pass2hex(pass) + this.salt(), 17));
            var obj = CryptoJS.TripleDES[method](cb(CryptoJS.enc.Hex.parse(hex)), g.start, { mode: CryptoJS.mode.CBC, iv: g.end });
            return this.pair(cb(obj).ciphertext);
        },

        //-----------------------------------------
        CheckPwdBusinessRules: function(pwd, CardNum) {
            //2.3.3  Business rules
            var isValid = true;
            var str1 = "0123456789";
            var str2 = "9876543210";
            var str3 = "1234567890";
            var str4 = "0987654321";
            if (str1.match(new RegExp("(" + pwd + ")", "i"))) isValid = false;
            else if (str2.match(new RegExp("(" + pwd + ")", "i"))) isValid = false;
            else if (str3.match(new RegExp("(" + pwd + ")", "i"))) isValid = false;
            else if (str4.match(new RegExp("(" + pwd + ")", "i"))) isValid = false;
            else if (CardNum.match(new RegExp("(" + pwd + ")", "i"))) isValid = false;
            if (isValid) {
                if (pwd.match(new RegExp(/(.)\1{3,}/))) isValid = false;
            }
            if (isValid) {
                if (pwd.match(new RegExp(/(.{4})\1+/))) isValid = false;
            }
            if (isValid) {
                if (pwd.substr(0, 4) == pwd.substr(4, 4).split("").reverse().join("")) isValid = false;
            }
            return isValid;
        },
        //-----------------------------------------

        codePage: {

            dosToAs: function(sTxt) {
                return this.dosbToAs(this.unicodeToWin1251(sTxt));
            },

            dosbToAs: function(bTxt) {
                return this.deCode(bTxt, 'dosToAs');
            },

            winToDos: function(sTxt) {
                return this.deCode(this.unicodeToWin1251(sTxt), 'winToDos');
            },

            lib: {
                winToDos: [
                    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                    0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
                    0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
                    0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
                    0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
                    0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
                    0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
                    0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
                    0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F,
                    0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F,
                    0xFF, 0xF6, 0xF7, 0x3F, 0xFD, 0x3F, 0x3F, 0x3F, 0xF0, 0x3F, 0xF2, 0x3F, 0x3F, 0x3F, 0x3F, 0xF4,
                    0xF8, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0x3F, 0xFA, 0xF1, 0xFC, 0xF3, 0x3F, 0x3F, 0x3F, 0x3F, 0xF5,
                    0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
                    0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
                    0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
                    0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF
                ],

                dosToAs: [
                    0x00, 0x01, 0x02, 0x03, 0x37, 0x2D, 0x2E, 0x2F, 0x16, 0x05, 0x25, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
                    0x10, 0x11, 0x12, 0x13, 0x3C, 0x1E, 0x32, 0x26, 0x18, 0x19, 0x1C, 0x27, 0x07, 0x1D, 0x1E, 0x1F,
                    0x40, 0x4F, 0x7F, 0x7B, 0x5B, 0x6C, 0x50, 0x7D, 0x4D, 0x5D, 0x5C, 0x4E, 0x6B, 0x60, 0x4B, 0x61,
                    0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0x7A, 0x5E, 0x4C, 0x7E, 0x6E, 0x6F,
                    0x7C, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6,
                    0xD7, 0xD8, 0xD9, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0x4A, 0xE0, 0x5A, 0x5F, 0x6D,
                    0x79, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96,
                    0x97, 0x98, 0x99, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xC0, 0x6A, 0xD0, 0xA1, 0x3F,
                    0xB9, 0xBA, 0xED, 0xBF, 0xBC, 0xBD, 0xEC, 0xFA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF, 0xDA, 0xDB, 0xDC,
                    0xDE, 0xDF, 0xEA, 0xEB, 0xBE, 0xCA, 0xBB, 0xFE, 0xFB, 0xFD, 0x57, 0xEF, 0xEE, 0xFC, 0xB8, 0xDD,
                    0x77, 0x78, 0xAF, 0x8D, 0x8A, 0x8B, 0xAE, 0xB2, 0x8F, 0x90, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
                    0x2B, 0x2C, 0x09, 0x21, 0x28, 0x1B, 0x3D, 0xFF, 0x42, 0x38, 0x31, 0x34, 0x33, 0x43, 0x46, 0x24,
                    0x22, 0x17, 0x29, 0x06, 0x20, 0x2A, 0x47, 0x49, 0x1A, 0x35, 0x08, 0x39, 0x36, 0x30, 0x3A, 0x51,
                    0x52, 0x53, 0x54, 0x56, 0x59, 0x0A, 0x62, 0x65, 0x66, 0x23, 0x15, 0x14, 0x04, 0x68, 0x69, 0x3B,
                    0xAA, 0xAB, 0xAC, 0xAD, 0x8C, 0x8E, 0x80, 0xB6, 0xB3, 0xB5, 0xB7, 0xB1, 0xB0, 0xB4, 0x76, 0xA0,
                    0x63, 0x44, 0x64, 0x45, 0x67, 0x48, 0x74, 0x55, 0x70, 0x71, 0x72, 0x73, 0x58, 0x75, 0x3E, 0x41
                ],

                dMap: {
                    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14,
                    15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27,
                    28: 28, 29: 29, 30: 30, 31: 31, 32: 32, 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40,
                    41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53,
                    54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66,
                    67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79,
                    80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92,
                    93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103,
                    104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113,
                    114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123,
                    124: 124, 125: 125, 126: 126, 127: 127, 1027: 129, 8225: 135, 1046: 198, 8222: 132, 1047: 199,
                    1168: 165, 1048: 200, 1113: 154, 1049: 201, 1045: 197, 1050: 202, 1028: 170, 160: 160, 1040: 192,
                    1051: 203, 164: 164, 166: 166, 167: 167, 169: 169, 171: 171, 172: 172, 173: 173, 174: 174, 1053: 205,
                    176: 176, 177: 177, 1114: 156, 181: 181, 182: 182, 183: 183, 8221: 148, 187: 187, 1029: 189, 1056: 208,
                    1057: 209, 1058: 210, 8364: 136, 1112: 188, 1115: 158, 1059: 211, 1060: 212, 1030: 178, 1061: 213,
                    1062: 214, 1063: 215, 1116: 157, 1064: 216, 1065: 217, 1031: 175, 1066: 218, 1067: 219, 1068: 220,
                    1069: 221, 1070: 222, 1032: 163, 8226: 149, 1071: 223, 1072: 224, 8482: 153, 1073: 225, 8240: 137,
                    1118: 162, 1074: 226, 1110: 179, 8230: 133, 1075: 227, 1033: 138, 1076: 228, 1077: 229, 8211: 150,
                    1078: 230, 1119: 159, 1079: 231, 1042: 194, 1080: 232, 1034: 140, 1025: 168, 1081: 233, 1082: 234,
                    8212: 151, 1083: 235, 1169: 180, 1084: 236, 1052: 204, 1085: 237, 1035: 142, 1086: 238, 1087: 239,
                    1088: 240, 1089: 241, 1090: 242, 1036: 141, 1041: 193, 1091: 243, 1092: 244, 8224: 134, 1093: 245,
                    8470: 185, 1094: 246, 1054: 206, 1095: 247, 1096: 248, 8249: 139, 1097: 249, 1098: 250, 1044: 196,
                    1099: 251, 1111: 191, 1055: 207, 1100: 252, 1038: 161, 8220: 147, 1101: 253, 8250: 155, 1102: 254,
                    8216: 145, 1103: 255, 1043: 195, 1105: 184, 1039: 143, 1026: 128, 1106: 144, 8218: 130, 1107: 131,
                    8217: 146, 1108: 186, 1109: 190
                }
            },

            deCode: function(bTxt, codTb) {
                var outTxt = [];
                var cp = this.lib[codTb];
                var getCharCode = bTxt instanceof Array ?
                    function(a, i) { return a[i]; } :
                    function(s, i) { return s.charCodeAt(i); };
                for (var i = 0; i < bTxt.length; i++) {
                    var j = getCharCode(bTxt, i);
                    outTxt[i] = cp[j];
                }
                return outTxt;
            },

            unicodeToWin1251: function(s) {
                var L = [];
                for (var i = 0; i < s.length; i++) {
                    var ord = s.charCodeAt(i);
                    if (!(ord in this.lib.dMap))
                        throw "Character " + s.charAt(i) + " isn't supported by win1251!";
                    L.push(String.fromCharCode(this.lib.dMap[ord]));
                }
                return L.join('');
            }
        }
    },

    msg: {
        len_n_fmt: CRB_M.len_n_fmt,
        crypt_err: CRB_M.crypt_err,
        invalid: CRB_M.invalid,

        SESSION: CRB_M.SESSION,
        PASS: CRB_M.PASS,
        PASS2: CRB_M.PASS2,
        PASS_COMPARE: CRB_M.PASS_COMPARE,
        INVALID_PIN2: CRB_M.INVALID_PIN2,
        PIN2: CRB_M.PIN2,
        ENC_PIN2: CRB_M.ENC_PIN2,
        INKEY: CRB_M.INKEY,
        NUMKEY: CRB_M.NUMKEY,
        NUMCLIENT: CRB_M.NUMCLIENT
    },
    _eol: "\r\n"

};

