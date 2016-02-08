

var g_imei = '35374906******L';
var g_simsn = '897010266********L';

function getImei(val, mask) {
	var serial = (Math.abs(crc32(val) % 1000000)) + '';
	
	if(isset(mask))
		var g_imei = mask;
	
	g_imei = g_imei.replace(/\*{6}/, serial);
	g_imei = g_imei.replace(/L/, luhnGet(g_imei.replace(/L/, '')));

	AnyBalance.trace('imei param is: ' + g_imei);
	return g_imei;
}

function getSimId(val, mask) {
	serial = (Math.abs(crc32(val + 'simSN') % 100000000)) + '';
	
	if(isset(mask))
		var g_simsn = mask;

	g_simsn = g_simsn.replace(/\*{8}/, serial);
	g_simsn = g_simsn.replace(/L/, luhnGet(g_simsn.replace(/L/, '')));
	
	AnyBalance.trace('simSN param is: ' + g_simsn);
	
	return g_imei;
}

var makeCRCTable = function(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

var crc32 = function(str) {
    var crcTable = makeCRCTable();
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

function luhnGet(num) {
	var arr = [],
	num = num.toString();
	for(var i = 0; i < num.length; i++) {
		if(i % 2 === 0) {
			var m = parseInt(num[i]) * 2;
			if(m > 9) {
				arr.push(m - 9);
			} else {
				arr.push(m);
			} 
		} else {
			var n = parseInt(num[i]);
			arr.push(n)
		}
	}
	
	var summ = arr.reduce(function(a, b) { return a + b; });
	return (summ % 10);
}