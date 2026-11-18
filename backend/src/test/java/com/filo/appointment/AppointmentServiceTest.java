package com.filo.appointment;
import com.filo.catalog.*;
import com.filo.common.DomainException;
import java.time.*;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {
 @Mock AppointmentRepository appointments;@Mock ClientRepository clients;@Mock BarberRepository barbers;@Mock ServiceRepository services;
 AppointmentService subject;
 Client client;Barber barber;ServiceOffering service;
 @BeforeEach void data(){
  subject=new AppointmentService(appointments,clients,barbers,services,Clock.fixed(Instant.parse("2026-11-18T02:30:00Z"),ZoneId.of("America/Argentina/Buenos_Aires")));
  client=new Client();client.id=1L;client.name="Cliente";
  barber=new Barber();barber.id=2L;barber.name="Barbero";
  service=new ServiceOffering();service.id=3L;service.name="Corte";service.duration=30;service.price=new BigDecimal("12000");
 }
 AppointmentService.Input input(LocalTime time,Appointment.Status status,Long version){
  return new AppointmentService.Input(version,1L,2L,3L,LocalDate.of(2026,11,18),time,status,"");
 }
 void lookups(){when(clients.findById(1L)).thenReturn(Optional.of(client));when(barbers.findById(2L)).thenReturn(Optional.of(barber));when(services.findById(3L)).thenReturn(Optional.of(service));}
 void save(){when(appointments.saveAndFlush(any())).thenAnswer(i->{Appointment a=i.getArgument(0);a.id=10L;a.version=0L;return a;});}
 @Test void snapshotsCurrentServiceOnCreate(){
  lookups();save();var a=subject.create(input(LocalTime.of(9,0),Appointment.Status.CONFIRMED,null));
  assertEquals(new BigDecimal("12000"),a.price());assertEquals(30,a.duration());
 }
 @Test void refusesOverlap(){lookups();when(appointments.overlaps(eq(2L),eq(-1L),any(),any())).thenReturn(true);
  DomainException ex=assertThrows(DomainException.class,()->subject.create(input(LocalTime.of(9,0),Appointment.Status.CONFIRMED,null)));
  assertEquals(409,ex.status);verify(appointments,never()).saveAndFlush(any());
 }
 @Test void refusesTurnEndingAfterClosing(){lookups();assertThrows(DomainException.class,()->subject.create(input(LocalTime.of(19,45),Appointment.Status.CONFIRMED,null)));verify(appointments,never()).saveAndFlush(any());}
 @Test void allowsTurnEndingExactlyAtClosing(){lookups();save();assertEquals(LocalTime.of(19,30),subject.create(input(LocalTime.of(19,30),Appointment.Status.CONFIRMED,null)).time());}
 @Test void rejectsInactiveBarber(){lookups();barber.active=false;assertThrows(DomainException.class,()->subject.create(input(LocalTime.of(9,0),Appointment.Status.CONFIRMED,null)));verify(appointments,never()).saveAndFlush(any());}
 Appointment existing(){
  Appointment a=new Appointment();a.id=10L;a.version=4L;a.client=client;a.barber=barber;a.service=service;a.duration=45;a.price=new BigDecimal("9000");a.status=Appointment.Status.CONFIRMED;
  a.start=LocalDateTime.of(2026,11,18,9,0);a.end=a.start.plusMinutes(a.duration);
  when(appointments.findById(10L)).thenReturn(Optional.of(a));return a;
 }
 @Test void retainsHistoricalPriceAndDurationOnReschedule(){
  lookups();existing();save();var a=subject.update(10L,input(LocalTime.of(10,0),Appointment.Status.CONFIRMED,4L));
  assertEquals(45,a.duration());assertEquals(new BigDecimal("9000"),a.price());
 }
 @Test void rejectsStaleUpdate(){
  existing();DomainException ex=assertThrows(DomainException.class,()->subject.update(10L,input(LocalTime.of(10,0),Appointment.Status.CONFIRMED,3L)));
  assertEquals(409,ex.status);verify(appointments,never()).saveAndFlush(any());
 }
 @Test void cancellationDoesNotCheckOccupiedSlot(){
  lookups();existing();save();assertEquals(Appointment.Status.CANCELLED,subject.update(10L,input(LocalTime.of(10,0),Appointment.Status.CANCELLED,4L)).status());
  verify(appointments,never()).overlaps(any(),any(),any(),any());
 }
 @Test void rejectsTimesOutsideFiveMinuteGrid(){assertThrows(DomainException.class,()->AppointmentService.validateHours(LocalDateTime.of(2026,11,18,9,2),LocalDateTime.of(2026,11,18,9,32)));}
 AppointmentService.Input dated(LocalDate date,LocalTime time,Appointment.Status status,Long version){
  return new AppointmentService.Input(version,1L,2L,3L,date,time,status,"");
 }
 @Test void rejectsYesterdayBeforeAccessingRepositories(){
  DomainException e=assertThrows(DomainException.class,()->subject.create(dated(LocalDate.of(2026,11,16),LocalTime.of(9,0),Appointment.Status.CONFIRMED,null)));
  assertEquals(400,e.status);verifyNoInteractions(appointments,clients,barbers,services);
 }
 @Test void acceptsTodayInArgentinaEvenWhenUtcIsTomorrow(){
  lookups();save();assertEquals(LocalDate.of(2026,11,17),subject.create(dated(LocalDate.of(2026,11,17),LocalTime.of(9,0),Appointment.Status.CONFIRMED,null)).date());
 }
 @Test void rejectsReschedulingAnExistingTurnToYesterday(){
  existing();assertThrows(DomainException.class,()->subject.update(10L,dated(LocalDate.of(2026,11,16),LocalTime.of(9,0),Appointment.Status.CONFIRMED,4L)));
  verify(appointments,never()).saveAndFlush(any());
 }
 @Test void allowsCancellingAHistoricalTurnWithoutChangingItsSchedule(){
  Appointment a=existing();a.start=LocalDateTime.of(2026,11,16,9,0);lookups();save();
  assertEquals(Appointment.Status.CANCELLED,subject.update(10L,dated(a.start.toLocalDate(),a.start.toLocalTime(),Appointment.Status.CANCELLED,4L)).status());
 }
 @Test void rejectsChangingTheTimeOfAHistoricalTurn(){
  Appointment a=existing();a.start=LocalDateTime.of(2026,11,16,9,0);
  assertThrows(DomainException.class,()->subject.update(10L,dated(a.start.toLocalDate(),LocalTime.of(10,0),Appointment.Status.CONFIRMED,4L)));
 }
 @Test void rejectsReactivatingACancelledHistoricalTurn(){
  Appointment a=existing();a.start=LocalDateTime.of(2026,11,16,9,0);a.status=Appointment.Status.CANCELLED;
  assertThrows(DomainException.class,()->subject.update(10L,dated(a.start.toLocalDate(),a.start.toLocalTime(),Appointment.Status.CONFIRMED,4L)));
 }
}
