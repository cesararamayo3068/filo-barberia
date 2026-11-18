package com.filo.appointment;
import com.filo.catalog.*;
import com.filo.common.DomainException;
import jakarta.validation.constraints.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional
public class AppointmentService {
 private final AppointmentRepository appointments;private final ClientRepository clients;private final BarberRepository barbers;private final ServiceRepository services;
 private final Clock clock;
 public AppointmentService(AppointmentRepository a,ClientRepository c,BarberRepository b,ServiceRepository s,Clock clock){appointments=a;clients=c;barbers=b;services=s;this.clock=clock;}
 public record Input(Long version,@NotNull Long clientId,@NotNull Long barberId,@NotNull Long serviceId,@NotNull LocalDate date,@NotNull LocalTime time,@NotNull Appointment.Status status,@NotNull @Size(max=500) String notes){}
 public record View(Long id,Long version,Long clientId,String clientName,Long barberId,String barberName,Long serviceId,String serviceName,LocalDate date,LocalTime time,int duration,BigDecimal price,Appointment.Status status,String notes){}
 public static View view(Appointment a){return new View(a.id,a.version,a.client.getId(),a.client.getName(),a.barber.getId(),a.barber.getName(),a.service.getId(),a.service.getName(),a.start.toLocalDate(),a.start.toLocalTime(),a.duration,a.price,a.status,a.notes);}
 @Transactional(readOnly=true)
 public List<View> range(LocalDate from,LocalDate to){
  if(to.isBefore(from)||to.isAfter(from.plusDays(62)))throw new DomainException(400,"Consultá un rango de hasta 62 días.");
  return appointments.findByStartGreaterThanEqualAndStartLessThanOrderByStartAsc(from.atStartOfDay(),to.plusDays(1).atStartOfDay()).stream().map(AppointmentService::view).toList();
 }
 @Transactional(readOnly=true)
 public List<View> history(Long clientId){return appointments.findByClientIdOrderByStartDesc(clientId).stream().map(AppointmentService::view).toList();}
 public View create(Input i){return save(new Appointment(),i);}
 public View update(Long id,Input i){
  Appointment a=appointments.findById(id).orElseThrow(()->new DomainException(404,"No encontramos el turno."));
  CatalogController.version(a.version,i.version);return save(a,i);
 }
 private View save(Appointment a,Input i){
  validateDate(a,i);
  Client client=clients.findById(i.clientId).orElseThrow(()->new DomainException(404,"No encontramos el cliente."));
  Barber barber=barbers.findById(i.barberId).orElseThrow(()->new DomainException(404,"No encontramos el barbero."));
  ServiceOffering service=services.findById(i.serviceId).orElseThrow(()->new DomainException(404,"No encontramos el servicio."));
  if((!client.isActive()&&(a.client==null||!a.client.getId().equals(client.getId())))||
     (!barber.isActive()&&(a.barber==null||!a.barber.getId().equals(barber.getId())))||
     (!service.isActive()&&(a.service==null||!a.service.getId().equals(service.getId()))))
    throw new DomainException(400,"Elegí un cliente, servicio y barbero activos.");
  boolean keepSnapshot=a.id!=null&&a.service.getId().equals(service.getId());
  int duration=keepSnapshot?a.duration:service.getDuration();
  LocalDateTime start=i.date.atTime(i.time),end=start.plusMinutes(duration);
  validateHours(start,end);
  if(i.status!=Appointment.Status.CANCELLED&&appointments.overlaps(barber.getId(),a.id==null?-1L:a.id,start,end))
    throw new DomainException(409,"Ese barbero ya tiene un turno en ese horario.");
  a.client=client;a.barber=barber;a.service=service;a.start=start;a.end=end;a.duration=duration;
  if(!keepSnapshot)a.price=service.getPrice();
  a.status=i.status;a.notes=i.notes.strip();
  return view(appointments.saveAndFlush(a));
 }
 private void validateDate(Appointment a,Input i){
  if(!i.date.isBefore(LocalDate.now(clock)))return;
  boolean unchanged=a.id!=null&&i.date.equals(a.start.toLocalDate())&&i.time.equals(a.start.toLocalTime())&&
    i.clientId.equals(a.client.getId())&&i.barberId.equals(a.barber.getId())&&i.serviceId.equals(a.service.getId());
  boolean reactivating=a.id!=null&&a.status==Appointment.Status.CANCELLED&&i.status!=Appointment.Status.CANCELLED;
  if(!unchanged||reactivating)throw new DomainException(400,"No se pueden reservar ni reprogramar turnos en días anteriores a hoy.");
 }
 static void validateHours(LocalDateTime start,LocalDateTime end){
  if(start.getSecond()!=0||start.getNano()!=0||start.getMinute()%5!=0||
    start.toLocalTime().isBefore(LocalTime.of(8,0))||!start.toLocalDate().equals(end.toLocalDate())||end.toLocalTime().isAfter(LocalTime.of(20,0)))
   throw new DomainException(400,"El turno debe estar entre las 08:00 y las 20:00, en intervalos de 5 minutos.");
 }
}
