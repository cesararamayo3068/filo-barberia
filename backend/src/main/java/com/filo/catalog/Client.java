package com.filo.catalog;
import jakarta.persistence.*;
@Entity @Table(name="client")
public class Client {
 public Long getId(){return id;}
 public String getName(){return name;}
 public boolean isActive(){return active;}
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @Column(nullable=false,length=80) public String name;
 @Column(nullable=false,length=32) public String phone="";
 @Column(nullable=false,length=500) public String notes="";
 @Column(nullable=false) public boolean active=true;
}
