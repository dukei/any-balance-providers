/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
Provider for Rednews
mailto:wtiger@mail.ru
*/
function onChangeType(){
	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''},
		password: {visible: ''},
		PUK2: {visible: ''},
		phone: {visible: ''},
	});
	var siteVisible=(!props.source.value||props.source.value!='app')
	var appVisible=(!props.source.value||props.source.value!='new')
	AnyBalance.setPreferenceProperties({
		password: {visible: siteVisible},
		PUK2: {visible: appVisible},
		phone: {visible: appVisible},

	});
}

function main(){
	AnyBalance.addCallback('change#source', onChangeType);
	onChangeType();
}