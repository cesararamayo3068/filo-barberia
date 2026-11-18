package com.filo.appointment;
import com.filo.catalog.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;
@Entity @Table(name="appointment")
public class Appointment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="client_id") public Client client;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="barber_id") public Barber barber;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="service_id") public ServiceOffering service;
 @Column(name="start_at",nullable=false) public LocalDateTime start;
 @Column(name="end_at",nullable=false) public LocalDateTime end;
 @Column(nullable=false) public int duration;
 @Column(nullable=false,precision=12,scale=2) public BigDecimal price;
 @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) public Status status;
 @Column(nullable=false,length=500) public String notes="";
 public enum Status {CONFIRMED,PENDING,COMPLETE,CANCELLED}
}
