
CREATE DATABASE IF NOT EXISTS CampusCareDB;

USE CampusCareDB;

CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_code VARCHAR(30) UNIQUE,
    student_name VARCHAR(100) NOT NULL,
    student_email VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    location VARCHAR(150) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    photo VARCHAR(255),
    status ENUM('Pending', 'In Progress', 'Resolved')
        NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
