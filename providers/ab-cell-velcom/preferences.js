/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
*/

function onChangeSource(){

	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''}
	});

	if(props.source.value == 'cell'){
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			password: {visible: true},
			phone: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			password: {visible: true},
			phone: {visible: false}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#source', onChangeSource);
	onChangeSource();
}
