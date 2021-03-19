/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
Provider for Rednews
mailto:wtiger@mail.ru
*/
function onChangeType(){
	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''},
		showLimit: {visible: ''},
	});
	var siteVisible=(!props.source.value||props.source.value!='app')
	var appVisible=(!props.source.value||props.source.value!='site')
	AnyBalance.setPreferenceProperties({
		showLimit: {visible: siteVisible}
	});
}

function main(){
	AnyBalance.addCallback('change#source', onChangeType);
	onChangeType();
}