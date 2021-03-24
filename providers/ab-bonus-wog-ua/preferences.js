/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
Provider for Rednews
mailto:wtiger@mail.ru
*/
function onChangeSource(){
	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''}
	});
	var appVisible=(!props.source.value||props.source.value!='site');
	AnyBalance.setPreferenceProperties({
		phone: {visible: appVisible},
		login: {visible: !appVisible},
                password:{visible: !appVisible},
                card:{visible: !appVisible}

	});
}
function main(){
	AnyBalance.addCallback('change#source', onChangeSource);
	onChangeSource();
}