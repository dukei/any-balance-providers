/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)
Provider for Rednews
mailto:wtiger@mail.ru
*/
function onChangeSource(){
	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''},
		interval: {checked: ''}
	});
	var siteVisible=(!props.source.value||props.source.value!='app');
	var intervalChecked=(siteVisible && props.interval.checked);
	AnyBalance.setPreferenceProperties({
		showLimit: {visible: siteVisible},
		interval: {visible: siteVisible},
		end: {visible: intervalChecked},
                begin:{visible: intervalChecked}

	});
}
function onChangeInterval(){
	var props = AnyBalance.getPreferenceProperties({
		interval: {checked: ''}
	});
	var intervalChecked=props.interval.checked;
	AnyBalance.setPreferenceProperties({
		end: {visible: intervalChecked},
                begin:{visible: intervalChecked}

	});
}

function main(){
	AnyBalance.addCallback('change#source', onChangeSource);
	AnyBalance.addCallback('change#interval', onChangeInterval);
	onChangeSource();
}