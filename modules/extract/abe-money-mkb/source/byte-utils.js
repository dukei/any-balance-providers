var byteUtils = {
    hexChar: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"],
    // Генерирует случайный байт
    getRandomByte: function () {
        var rnd = 1 / (Math.random() * Math.random() + Math.random() + 1);
        return Math.floor(rnd * 255);
    },
    // Генерирует массив случайных байтов длинны count
    getRandomBytes: function (count) {
    	if (typeof window.crypto != 'undefined')
    		return this.getCryptoRandomBytes(count);

        var randomBytes = new Array(count);
        for (var i = 0; i < count; i++) {
            randomBytes[i] = this.getRandomByte();
        }

        return randomBytes;
    },
	// Генерирует криптостойкий массив случайных байтов длинны count
    getCryptoRandomBytes: function (count) {
        var int8Array = new Uint8Array(count);
        window.crypto.getRandomValues(int8Array);
        var array = [].slice.call(int8Array);
        return array;
    },
	// Генерирует случайный байт в HEX
    getRandomByteHEX: function () {
    	return this.byteToHex(this.getRandomByte());
    },
	// Генерирует массив случайных байтов длинны count в HEX
    getRandomBytesHEX: function (count) {
    	return byteUtils.bytesToHex(this.getRandomBytes(count));
    },
	// Генерирует криптостойкий массив случайных байтов длинны count в HEX
    getCryptoRandomBytesHEX: function (count) {
    	return byteUtils.bytesToHex(this.getCryptoRandomBytes(count));
    },
    // XOR над массивом байт
    xorHEX: function (leftHEX, rightHEX) {
        var result = "";
        for (var i = 0; i < leftHEX.length; i += 2)
            result += this.byteToHex(this.hex2byte(leftHEX[i] + leftHEX[i + 1]) ^ this.hex2byte(rightHEX[i] + rightHEX[i + 1]));

        return result;
    },
    // Конвертируем байт в HEX строки (2 символа)
    byteToHex: function (b) {
        return this.hexChar[(b >> 4) & 0x0f] + this.hexChar[b & 0x0f];
    },
    // Конвертируем массив байт в HEX строку
    bytesToHex: function (bytes) {
        var result = "";
        for (var i = 0; i < bytes.length; i++)
            result = result + this.byteToHex(bytes[i])

        return result;
    },
    hex2byte: function (str) {
        return parseInt(str, 16);
    },
    // Разбирает строку HEX формата и формирует массив байтов
    hex2bytes: function (str) {
        var result = [];
        while (str.length >= 2) {
            result.push(this.hex2byte(str.substring(0, 2)));
            str = str.substring(2, str.length);
        }

        return result;
    },
    int2bytes: function (value) {
        return "" + this.byteToHex((value >> 24) & 0xFF) +
		this.byteToHex((value >> 16) & 0xFF) +
		this.byteToHex((value >> 8) & 0xFF) +
		this.byteToHex(value & 0xFF);
    },
    wordArrayToBytes: function (wordArray) {
        // Shortcuts
        var words = wordArray.words;
        var sigBytes = wordArray.sigBytes;

        // Convert
        var u8 = new Uint8Array(sigBytes);
        for (var i = 0; i < sigBytes; i++) {
            var byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            u8[i] = byte;
        }

        return u8;
    },
    getRandomInt: function () {
    	if(typeof window.crypto != 'undefined')
    	{
    		var int32array = new Int32Array(1);
    		window.crypto.getRandomValues(int32array);
    		return Math.abs(Math.floor(int32array[0]))
    	}
    	else {
    		return Math.floor(Math.random() * INT_MAX);
    	}
    },
    getRandomIntBounded: function(min, max) {
    	if (min >= max)
    		throw 'Минимальное значение должно быть строго меньше максимального';

    	var num = this.getRandomInt();
    	return Math.floor(((max - min) / INT_MAX) * num + min);
    }
}

var INT_MAX = 2147483647;