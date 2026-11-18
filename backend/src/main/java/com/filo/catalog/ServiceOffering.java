package com.filo.catalog;
import jakarta.persistence.*;
import java.math.BigDecimal;
@Entity @Table(name="service")
public class ServiceOffering {
 public Long getId(){return id;}
 public String getName(){return name;}
 public boolean isActive(){return active;}
 public int getDuration(){return duration;}
 public BigDecimal getPrice(){return price;}
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Version public Long version;
 @Column(nullable=false,length=80) public String name;
 @Column(nullable=false) public int duration;
 @Column(nullable=false,precision=12,scale=2) public BigDecimal price;
 @Column(nullable=false) public boolean active=true;
}
