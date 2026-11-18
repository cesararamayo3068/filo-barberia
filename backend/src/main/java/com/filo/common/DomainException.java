package com.filo.common;
public class DomainException extends RuntimeException {
 public final int status;
 public DomainException(int status,String message) {super(message);this.status=status;}
}
