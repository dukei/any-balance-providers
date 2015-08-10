function main() {
	"use strict";
	AnyBalance.trace('Connecting...');
	var url = "http://www.computeruniverse.net/en/tt.asp";
	var pref = AnyBalance.getPreferences();
	AnyBalance.trace(pref.parcel_number);
	AnyBalance.trace(pref.zip_code);
	
	var html = AnyBalance.requestPost(url, {
		"p" : pref.parcel_number,
		"Zip" : pref.zip_code,
		});

	var res;
	var regexp;
	regexp = /Your parcel/;
	if (regexp.exec(html)){
      		AnyBalance.trace ('Authorization Ok!');
	} else {
		var error = '';
		regexp=/errorbox.+?<td>([^<]+?)<\/td/i;
		if (res=regexp.exec(html)){
			error=res[1];
		}
		
      		AnyBalance.trace ('Authorization Required: '+error);
		throw new AnyBalance.Error ('Ошибка авторизации: '+error);
	}

	var result = {success: true};
	
	regexp = /basicboxcontainer(.+)boxcontainerdouble/;
	if (res = regexp.exec(html)) { html = res[1]; }

	if(AnyBalance.isAvailable('upu_code')) {
		regexp = /<td[^>]*>\s*UPU code \/ matchcode\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td/;
		if (res=regexp.exec(html)){ result.upu_code=res[1]; }
	}
	if(AnyBalance.isAvailable('date')) {
		regexp = /<td[^>]*>\s*Date\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td/;
		if (res=regexp.exec(html)){ result.date=res[1]; }
	}
	if(AnyBalance.isAvailable('brief_status')){
		regexp = /<td[^>]*>\s*Brief Status\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*</;
		if (res=regexp.exec(html)){ result.brief_status=res[1]; }
	}
	if(AnyBalance.isAvailable('status')) {
		regexp = /<td[^>]*>\s*Status\s*<\/td>\s*<td[^>]*>\s*(.+?)\s*<\/td/;
		if (res=regexp.exec(html)){ result.status=res[1]; }
	}

	AnyBalance.trace ('End parsing...');
	AnyBalance.setResult(result);
}
