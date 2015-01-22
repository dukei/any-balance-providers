package com.dukei.android.lib.anybalance;

public class AnyBalanceException extends RuntimeException {
	public AnyBalanceException(String message) {
		super(message);
	}

	public AnyBalanceException(String message, Throwable th) {
		super(message, th);
	}

	public AnyBalanceException(Throwable th) {
		super(th);
	}
}
