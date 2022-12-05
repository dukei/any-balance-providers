/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
*/

function onChangeMethod(){

	var props = AnyBalance.getPreferenceProperties({
		method: {value: ''}
	});

	if(props.method.value == 'pass'){
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			password: {visible: true},
			birthday: {visible: false}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			password: {visible: false},
			birthday: {visible: true}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#method', onChangeMethod);
	onChangeMethod();
}
