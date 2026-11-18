package com.filo.appointment;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface AppointmentRepository extends JpaRepository<Appointment,Long> {
 @EntityGraph(attributePaths={"client","barber","service"})
 List<Appointment> findByStartGreaterThanEqualAndStartLessThanOrderByStartAsc(LocalDateTime from,LocalDateTime to);
 @EntityGraph(attributePaths={"client","barber","service"})
 List<Appointment> findByClientIdOrderByStartDesc(Long clientId);
 @Query("select count(a)>0 from Appointment a where a.barber.id=:barber and a.id<>:exclude and a.status<>'CANCELLED' and a.start<:end and a.end>:start")
 boolean overlaps(@Param("barber")Long barber,@Param("exclude")Long exclude,@Param("start")LocalDateTime start,@Param("end")LocalDateTime end);
}
