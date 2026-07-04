# AI Assistant AWS Project

[![Unity](https://img.shields.io/badge/Unity-2022.3+-black?logo=unity&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-18.x-blue?logo=react&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-18.x+-green?logo=node.js&logoColor=white)](#)
[![AWS](https://img.shields.io/badge/AWS-DynamoDB%20%7C%20S3-orange?logo=amazon-aws&logoColor=white)](#)

Dự án **AI Assistant** là một hệ sinh thái Desktop AI Assistant tích hợp điện toán đám mây và trí tuệ nhân tạo, bao gồm ứng dụng tương tác Desktop AI Assistant (Unity), giao diện Web quản trị/cộng đồng (React), và hệ thống dịch vụ phụ trợ (Node.js/Express/AWS).

---

## Liên kết Dự án

*   **Demo trực tiếp:** [aa.locle1010.dpdns.org](http://aa.locle1010.dpdns.org)
*   **Hướng dẫn chạy chi tiết:** [locle1010.github.io/workshop/vi/5-workshop/](https://locle1010.github.io/workshop/vi/5-workshop/)

---

## Kiến trúc & Thành phần Dự án

Dự án được chia thành 3 phần chính nằm trong các thư mục tương ứng:

```text
PetWebAWSProject/
├── app/          # Ứng dụng Desktop AI Assistant (Unity)
├── frontend/     # Giao diện Web Client (React + Vite + Tailwind CSS)
└── backend/      # API Server (Node.js + Express + AWS SDK)
```

### 1. Desktop AI Assistant (`/app`)
Ứng dụng tương tác desktop chính được xây dựng bằng **Unity**, tập trung vào tính tương tác cao và tích hợp các dịch vụ thông minh:
*   **Trí tuệ nhân tạo:** Tích hợp trực tiếp **Gemini API** và **Llama Bridge** cục bộ để trò chuyện trực tiếp và phản hồi tự nhiên với người dùng.
*   **Giám sát & Quản lý hệ thống:** Tích hợp các module tự động giám sát tài nguyên hệ thống (CPU, RAM, v.v.) và thực thi các lệnh hệ thống nội bộ an toàn.
*   **Đồng bộ đám mây:** Kết nối trực tiếp với các dịch vụ AWS (S3, DynamoDB) thông qua bộ quản lý AWS riêng biệt để đồng bộ hóa bộ nhớ (Memory Core), thiết lập và dữ liệu của pet.

### 2. Web Frontend (`/frontend`)
Giao diện quản lý và cộng đồng trên nền tảng Web:
*   Được xây dựng trên **React**, **Vite** và **Tailwind CSS**.
*   Tích hợp **Three.js** / **React Three Fiber** để xem trước mô hình 3D của pet trực quan trên trình duyệt.
*   Sử dụng **AWS Amplify** để quản lý người dùng và xác thực bảo mật.

### 3. Backend API (`/backend`)
Hệ thống máy chủ dịch vụ quản lý dữ liệu:
*   Xây dựng bằng **Node.js** và **Express**.
*   Sử dụng cơ sở dữ liệu **Amazon DynamoDB** để lưu trữ thông tin cấu hình, dữ liệu người dùng và trạng thái của Pet.
*   Tích hợp **Amazon S3** để lưu trữ các tài nguyên tĩnh, tệp tin cấu hình lớn và các bản sao lưu.
*   Hỗ trợ triển khai Serverless (chạy trên AWS Lambda qua Serverless Framework).

---

*Để biết chi tiết hơn về cách cấu hình chi tiết AWS hoặc kết nối API AI, vui lòng tham khảo [Hướng dẫn chi tiết](https://locle1010.github.io/workshop/vi/5-workshop/).*
