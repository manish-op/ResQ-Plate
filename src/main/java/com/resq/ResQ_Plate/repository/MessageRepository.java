package com.resq.ResQ_Plate.repository;

import com.resq.ResQ_Plate.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByClaimIdOrderByTimestampAsc(UUID claimId);
}
