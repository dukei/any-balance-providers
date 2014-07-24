/*
Provider of AnyBalance (http://any-balance-providers.googlecode.com)

Provider for Rednews
mailto:wtiger@mail.ru
*/
function onChangeType(){
	var props = AnyBalance.getPreferenceProperties({
		source: {value: ''},
		currency: {visible: ''},
		in_language: {visible: ''},
		in_currency: {visible: ''},
		dx_currency: {visible: ''},
		select_timezone_ff: {value:'',visible: ''},
		timezone_ff: {visible: ''},
		select_timezone_in: {value:'',visible: ''},
		timezone_in: {visible: ''},
		select_timezone_dx: {value:'',visible: ''},
		timezone_dx: {visible: ''},
	});

	if(props.source.value==null || props.source.value==""){//All
		AnyBalance.setPreferenceProperties({
			currency: {visible: true},
			in_language: {visible: true},
			in_currency: {visible: true},
			dx_currency: {visible: true},
			select_timezone_ff: {visible: true},
			select_timezone_in: {visible: true},
			select_timezone_dx: {visible: true},
		});
		if(props.select_timezone_ff.value==1 || props.select_timezone_ff.value==null)
			AnyBalance.setPreferenceProperties({timezone_ff: {visible: false}});
		else
			AnyBalance.setPreferenceProperties({timezone_ff: {visible: true}});

		if(props.select_timezone_in.value==1 || props.select_timezone_in.value==null)
			AnyBalance.setPreferenceProperties({timezone_in: {visible: false}});
		else
			AnyBalance.setPreferenceProperties({timezone_in: {visible: true}});

		if(props.select_timezone_dx.value==1 || props.select_timezone_dx.value==null)
			AnyBalance.setPreferenceProperties({timezone_dx: {visible: false}});
		else
			AnyBalance.setPreferenceProperties({timezone_dx: {visible: true}});

	}else if(props.source.value==1){//ForexFactory
		AnyBalance.setPreferenceProperties({
			currency: {visible: true},
			in_language: {visible: false},
			in_currency: {visible: false},
			select_timezone_ff: {visible: true},
			select_timezone_in: {visible: false},
			select_timezone_dx: {visible: false},
			timezone_in: {visible: false},
			timezone_dx: {visible: false},
		});
		if(props.select_timezone_ff.value==1 || props.select_timezone_ff.value==null)
			AnyBalance.setPreferenceProperties({timezone_ff: {visible: false}});
		else
			AnyBalance.setPreferenceProperties({timezone_ff: {visible: true}});

	}else if(props.source.value == 2){
		AnyBalance.setPreferenceProperties({
			currency: {visible: false},
			in_language: {visible: true},
			in_currency: {visible: true},
			select_timezone_ff: {visible: false},
			select_timezone_in: {visible: true},
			select_timezone_dx: {visible: false},
			timezone_ff: {visible: false},
			timezone_dx: {visible: false},
		});
		if(props.select_timezone_in.value==1 || props.select_timezone_in.value==null)
			AnyBalance.setPreferenceProperties({timezone_in: {visible: false}});
		else
			AnyBalance.setPreferenceProperties({timezone_in: {visible: true}});
	}else if(props.source.value == 3){
		AnyBalance.setPreferenceProperties({
			currency: {visible: false},
			in_language: {visible: false},
			in_currency: {visible: false},
			select_timezone_ff: {visible: false},
			select_timezone_in: {visible: false},
			select_timezone_dx: {visible: true},
			timezone_ff: {visible: false},
			timezone_in: {visible: false},
		});
		if(props.select_timezone_dx.value==1 || props.select_timezone_dx.value==null)
			AnyBalance.setPreferenceProperties({timezone_dx: {visible: false}});
		else
			AnyBalance.setPreferenceProperties({timezone_dx: {visible: true}});
	};
}

function main(){
	AnyBalance.addCallback('change#source', onChangeType);
	AnyBalance.addCallback('change#select_timezone_ff', onChangeType);
	AnyBalance.addCallback('change#select_timezone_in', onChangeType);
	AnyBalance.addCallback('change#select_timezone_dx', onChangeType);
	onChangeType();
}
