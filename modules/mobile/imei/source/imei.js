function generateImei(val, mask) {
	var g_imei_default = '35374906******L'; //Samsung
	var serial = (Math.abs(crc32(val) % 1000000)) + '';
	
	if(!mask)
		mask = g_imei_default;
	
	mask = mask.replace(/\*{6}/, serial);
	mask = mask.replace(/L/, luhnGet(mask.replace(/L/, '')));

	AnyBalance.trace('imei param is: ' + mask);
	return mask;
}

function generateSimSN(val, mask) {
	var g_simsn_default = '897010266********L'; //билайн
	var serial = (Math.abs(crc32(val + 'simSN') % 100000000)) + '';
	
	if(!mask)
		mask = g_simsn_default;

	mask = mask.replace(/\*{8}/, serial);
	mask = mask.replace(/L/, luhnGet(mask.replace(/L/, '')));
	
	AnyBalance.trace('simSN param is: ' + mask);
	
	return mask;
}
