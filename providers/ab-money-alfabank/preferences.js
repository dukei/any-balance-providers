/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
*/

function onChangeMethod(){

	var props = AnyBalance.getPreferenceProperties({
		method: {value: ''}
	});

	if(props.method.value == 'card'){
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			cardnum: {visible: true},
			accountnum: {visible: false},
			source: {visible: true},
			num: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			cardnum: {visible: false},
			accountnum: {visible: true},
			source: {visible: true},
			num: {visible: true}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#method', onChangeMethod);
	onChangeMethod();
}