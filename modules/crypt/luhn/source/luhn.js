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