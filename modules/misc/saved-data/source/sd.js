/**
Процедура входа в Яндекс. Унифицирована и выделена в отдельный файл для удобства встраивания
*/

function SavedData(provider, account, defaultData){
	function getDataName(){
    	return provider + '_' + account;
	}

	function getDataObj(){
		return AnyBalance.getData(getDataName(), defaultData || {});
	}

	function setCookies() {
    	var obj = getDataObj();
    	obj.cookies = AnyBalance.getCookies();
		AnyBalance.setData(getDataName(), obj);
	}

	/**
	 *
	 * @param filter: undefined|RegExp|(domain, name, value, cookie) => boolean
	 */
	function restoreCookies(filter){
		if(filter instanceof RegExp) {
			const re = filter
			filter = c => re.test(c.name)
		}
		var cookies = getDataObj().cookies;
		for(var i=0; cookies && i<cookies.length; ++i){
			var cookie = cookies[i];
			if(!filter || filter(cookie))
				AnyBalance.setCookie(cookie.domain, cookie.name, cookie.value, cookie);
		}
	}

	function save(){
		AnyBalance.saveData(true);
	}

	function set(name, value){
		var obj = getDataObj();
		obj[name] = value;
		AnyBalance.setData(getDataName(), obj);
	}

	function get(name, defValue){
		var obj = getDataObj();
		var v = obj[name];
		return v === undefined ? defValue : v;
	}

	return {
		getDataObj: getDataObj,
		setCookies: setCookies,
		restoreCookies: restoreCookies,
		save: save,
		set: set,
		get: get
	}
}

