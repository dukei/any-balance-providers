/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for FX-Trend
WWW: http://www.fx-trend.com
mailto:wtiger@mail.ru
*/
function onChangeSource(){

	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''}
	});

	if(props.source.value == 'app'){
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			login_site: {visible: false},
			password: {visible: false}
		});
	}else if(props.source.value == 'site'){
		AnyBalance.setPreferenceProperties({
			login: {visible: false},
			login_site: {visible: true},
			password: {visible: true}
		});
	}else{
		AnyBalance.setPreferenceProperties({
			login: {visible: true},
			login_site: {visible: true},
			password: {visible: true}
		});
	}

}

function main(){
	AnyBalance.addCallback('change#source', onChangeSource);
	onChangeSource();
}
