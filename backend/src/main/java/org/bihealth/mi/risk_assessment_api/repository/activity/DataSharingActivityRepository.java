package org.bihealth.mi.risk_assessment_api.repository.activity;

import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DataSharingActivityRepository extends JpaRepository<DataSharingActivity, Long> {
    List<DataSharingActivity> findByCreatorUsername(String creatorUsername);
    List<DataSharingActivity> findBySharedUsernamesContains(String username);
}
