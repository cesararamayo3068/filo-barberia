package com.filo.common;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.dao.*;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;
@RestControllerAdvice
public class Errors {
 @ExceptionHandler(DomainException.class)
 ResponseEntity<ProblemDetail> domain(DomainException e) {return error(e.status,e.getMessage());}
 @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class,MethodArgumentTypeMismatchException.class})
 ResponseEntity<ProblemDetail> invalid(Exception e) {return error(400,"Revisá los campos, fechas y valores ingresados.");}
 @ExceptionHandler({ObjectOptimisticLockingFailureException.class,OptimisticLockingFailureException.class})
 ResponseEntity<ProblemDetail> stale(Exception e) {return error(409,"Otra persona modificó este registro. Recargá los datos antes de guardar.");}
 @ExceptionHandler(DataIntegrityViolationException.class)
 ResponseEntity<ProblemDetail> conflict(Exception e) {return error(409,"El horario ya está ocupado o el cambio entra en conflicto con datos existentes.");}
 private ResponseEntity<ProblemDetail> error(int status,String message) {
  return ResponseEntity.status(status).body(ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(status),message));
 }
}
