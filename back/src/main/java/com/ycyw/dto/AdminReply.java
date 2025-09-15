package com.ycyw.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminReply {
	private String sender;
	private String content;
	private String type;
	private String targetClientId;
}
